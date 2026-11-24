import { validateLevel } from './engine.js'
import { rasterize, countryAt } from '../geo/rasterize.js'
import { findOffshoreAnchor, MAX_DOCK_DISTANCE } from '../geo/anchors.js'
import countryData from '../data/countries.json' with { type: 'json' }

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

  const object = (name, position) => {
    // The engine stores row-major indices; editor objects use the tile's top-left corner in pixels.
    const column = position % level.width
    const row = Math.floor(position / level.width)

    return {
      id: id++,
      name,
      type: '',
      x: column * TILE_SIZE,
      y: row * TILE_SIZE,
      width: TILE_SIZE,
      height: TILE_SIZE,
      rotation: 0,
      visible: true
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
    // Tiled's object labels already identify countries; color distinguishes movable flags.
    ...(name === 'flags' ? { color: '#ff0000' } : {}),
    objects
  })

  const metadata = ['id', 'region', 'mapVersion', 'threshold', 'sea', 'motif', 'planning']
  const metadataProperties = metadata
    .filter(name => level[name] !== undefined)
    .map(name => property(name, level[name]))

  // Custom properties carry the barrier description alongside the editable layers.
  const gateProperties = level.cut
    ? [
        property('cutAxis', level.cut.axis),
        property('cutPosition', level.cut.position),
        property('gates', JSON.stringify(level.gates))
      ]
    : []

  const layers = [
    tileLayer('floor', floor, 1),
    tileLayer('obstacles', obstacles, 2),
    objectLayer('targets', level.goals.map(goal => object(goal.country, goal.position))),
    objectLayer('flags', level.boxes.map(box => object(box.country, box.position))),
    objectLayer('player', [object('globe', level.player)])
  ]

  if (level.sea) {
    // Keep reference artwork above terrain but below editable actors without changing their IDs.
    layers.splice(2, 0, {
      id: id++,
      name: 'geography',
      type: 'imagelayer',
      image: `geography-${level.region}.svg`,
      locked: true,
      opacity: 1,
      visible: true,
      x: 0,
      y: 0
    })
  }

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
    layers,
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

    if (column < 0 || column >= map.width || row < 0 || row >= map.height) {
      throw new Error('Object is outside the map')
    }

    return row * map.width + column
  }

  const countryOf = object => {
    // Layer membership supplies the role; the name is the only authored country identity.
    const country = (object.name ?? '').trim().toUpperCase()
    if (!Object.hasOwn(countryData, country)) throw new Error(`Unknown country: ${object.name || '(unnamed)'}`)

    return country
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
      const country = countryOf(object)

      return { id: country, country, position: position(object) }
    }),
    goals: layer('targets').objects.map(object => ({
      country: countryOf(object),
      position: position(object),
      anchor: null
    }))
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

  const geography = rasterize(level.region, level.threshold)
  if (level.width !== geography.width || level.height !== geography.height) {
    throw new Error('Preserve the region dimensions')
  }
  if (Boolean(level.sea) !== geography.sea) throw new Error('Preserve the region sea mode')

  if (geography.sea) {
    const allowed = new Set(geography.floors)
    const invalid = level.floors.filter(position => !allowed.has(position))
    if (invalid.length) {
      throw new Error(`Sea floor contains ${invalid.length} invalid cells; use repair-terrain`)
    }
  }

  // Country containment and anchors use physical geometry, independent of authored terrain.
  for (const goal of level.goals) {
    const x = goal.position % level.width + 0.5
    const y = Math.floor(goal.position / level.width) + 0.5
    const country = countryAt(geography, x, y)

    if (!geography.sea) {
      if (country !== goal.country) throw new Error(`Target is outside ${goal.country}`)
      continue
    }

    if (country) throw new Error(`Dock for ${goal.country} must be on water`)

    goal.anchor = findOffshoreAnchor(geography, goal.country, goal.position)
    if (!goal.anchor) {
      throw new Error(`Dock for ${goal.country} is too far from its coastline (maximum ${MAX_DOCK_DISTANCE} tiles)`)
    }
  }

  return level
}
