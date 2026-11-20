import { validateLevel } from './engine.js'

const TILE_SIZE = 40

const property = (name, value) => {
  // Tiled uses its own property type names rather than JavaScript's typeof names.
  let type = 'string'
  if (typeof value === 'number') type = 'float'
  else if (typeof value === 'boolean') type = 'bool'

  return { name, type, value }
}

const properties = object => {
  const entries = (object.properties ?? []).map(item => [item.name, item.value])

  return Object.fromEntries(entries)
}

export function toTiled (level) {
  // Layers and objects share this counter. Build them in the existing order so exported IDs stay stable.
  let id = 1

  const object = (name, position, values = {}) => {
    // The engine stores row-major indices; editor objects use the tile's top-left corner in pixels.
    const column = position % level.width
    const row = Math.floor(position / level.width)

    return {
      id: id++,
      name,
      type: name,
      x: column * TILE_SIZE,
      y: row * TILE_SIZE,
      width: TILE_SIZE,
      height: TILE_SIZE,
      rotation: 0,
      visible: true,
      properties: Object.entries(values).map(([name, value]) => property(name, value))
    }
  }

  const floor = new Set(level.floors)
  const obstacles = new Set(level.obstacles)

  const tileLayer = (name, occupied, tile) => ({
    id: id++,
    name,
    type: 'tilelayer',
    width: level.width,
    height: level.height,
    x: 0,
    y: 0,
    opacity: 1,
    visible: true,
    // Empty editor cells use zero; floor and obstacle cells use their respective terrain tile IDs.
    data: Array.from({ length: level.width * level.height }, (_, position) => occupied.has(position) ? tile : 0)
  })

  const objectLayer = (name, objects) => ({
    id: id++,
    name,
    type: 'objectgroup',
    x: 0,
    y: 0,
    opacity: 1,
    visible: true,
    draworder: 'topdown',
    objects
  })

  const metadata = ['id', 'region', 'mapVersion', 'generatorVersion', 'threshold', 'sea', 'motif', 'planning']
  const metadataProperties = metadata
    .filter(name => level[name] !== undefined)
    .map(name => property(name, level[name]))
  if (level.obstacleArt) metadataProperties.push(property('obstacleArt', JSON.stringify(level.obstacleArt)))

  // Custom properties carry the barrier description alongside the editable layers.
  const gateProperties = level.cut
    ? [
        property('cutAxis', level.cut.axis),
        property('cutPosition', level.cut.position),
        property('gates', JSON.stringify(level.gates))
      ]
    : []

  return {
    type: 'map',
    version: '1.10',
    tiledversion: '1.10.2',
    orientation: 'orthogonal',
    renderorder: 'right-down',
    width: level.width,
    height: level.height,
    tilewidth: TILE_SIZE,
    tileheight: TILE_SIZE,
    infinite: false,
    properties: [...metadataProperties, ...gateProperties],
    tilesets: [{
      firstgid: 1,
      name: 'terrain',
      tilewidth: TILE_SIZE,
      tileheight: TILE_SIZE,
      tilecount: 2,
      columns: 2,
      image: 'terrain.svg',
      imagewidth: 80,
      imageheight: 40,
      spacing: 0,
      margin: 0
    }],
    layers: [
      tileLayer('floor', floor, 1),
      tileLayer('obstacles', obstacles, 2),
      objectLayer('targets', level.goals.map(goal => object(goal.country, goal.position, {
        country: goal.country,
        ...(goal.anchor ? { anchorX: goal.anchor[0], anchorY: goal.anchor[1] } : {})
      }))),
      objectLayer('flags', level.boxes.map(box => object(box.country, box.position, {
        country: box.country,
        boxId: box.id
      }))),
      objectLayer('player', [object('globe', level.player)])
    ],
    nextlayerid: 100,
    nextobjectid: 100
  }
}

export function fromTiled (map) {
  // The engine has one finite, unrotated grid; other editor coordinate systems cannot map directly to it.
  const unsupportedGrid = map?.orientation !== 'orthogonal' || map.infinite ||
    map.tilewidth !== TILE_SIZE || map.tileheight !== TILE_SIZE
  if (unsupportedGrid) throw new Error('Use a finite orthogonal map with 40-pixel tiles')

  const invalidDimensions = !Number.isInteger(map.width) || map.width < 1 ||
    !Number.isInteger(map.height) || map.height < 1
  if (invalidDimensions) throw new Error('Invalid map dimensions')

  const layer = name => {
    const layers = map.layers.filter(layer => layer.name === name)
    if (layers.length !== 1) throw new Error(`Expected one ${name} layer`)

    return layers[0]
  }

  const occupied = name => {
    const data = layer(name).data
    if (!Array.isArray(data) || data.length !== map.width * map.height) {
      throw new Error(`Invalid ${name} tile layer`)
    }

    // Layer names supply the meaning; any nonzero tile in that layer marks an occupied cell.
    return data.flatMap((tile, index) => tile ? [index] : [])
  }

  const position = object => {
    const misaligned = object.rotation !== 0 || object.x % TILE_SIZE !== 0 || object.y % TILE_SIZE !== 0
    if (misaligned) throw new Error('Objects must align with the tile grid and have no rotation')

    // Invert the export transform without rounding, so off-grid edits cannot silently move an actor.
    const row = object.y / TILE_SIZE
    const column = object.x / TILE_SIZE

    return row * map.width + column
  }

  const players = layer('player').objects
  if (players.length !== 1) throw new Error('Place exactly one player')

  const level = {
    ...properties(map),
    width: map.width,
    height: map.height,
    floors: occupied('floor'),
    obstacles: occupied('obstacles'),
    player: position(players[0]),
    boxes: layer('flags').objects.map(object => {
      const data = properties(object)

      return { id: data.boxId, country: data.country, position: position(object) }
    }),
    goals: layer('targets').objects.map(object => {
      const data = properties(object)
      const goalPosition = position(object)
      const anchor = data.anchorX === undefined ? null : [data.anchorX, data.anchorY]

      return { country: data.country, position: goalPosition, anchor }
    })
  }

  if (level.obstacleArt) {
    const art = JSON.parse(level.obstacleArt)
    const kinds = new Set(['ridge', 'boulder', 'reef'])
    if (!art || typeof art !== 'object' || Array.isArray(art) || Object.values(art).some(kind => !kinds.has(kind))) {
      throw new Error('Invalid story obstacle art')
    }
    level.obstacleArt = Object.fromEntries(Object.entries(art).filter(([position]) =>
      level.obstacles.includes(Number(position))
    ))
  }

  // Reassemble the engine's barrier metadata from the editor's flat custom properties.
  if (level.cutAxis) {
    level.cut = { axis: level.cutAxis, position: level.cutPosition }
    level.gates = JSON.parse(level.gates)
    delete level.cutAxis
    delete level.cutPosition
  }

  // Grid alignment alone does not establish legal starting positions or matching flags and destinations.
  const errors = validateLevel(level)
  if (errors.length) throw new Error(errors.join('; '))

  return level
}
