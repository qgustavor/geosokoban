import { validateLevel } from './engine.js'

const TILE_SIZE = 40
const property = (name, value) => ({ name, type: typeof value === 'number' ? 'float' : typeof value === 'boolean' ? 'bool' : 'string', value })
const properties = object => Object.fromEntries((object.properties ?? []).map(item => [item.name, item.value]))

export function toTiled (level) {
  let id = 1
  const object = (name, position, values = {}) => ({
    id: id++, name, type: name, x: position % level.width * TILE_SIZE, y: Math.floor(position / level.width) * TILE_SIZE,
    width: TILE_SIZE, height: TILE_SIZE, rotation: 0, visible: true,
    properties: Object.entries(values).map(([name, value]) => property(name, value))
  })
  const floor = new Set(level.floors)
  const obstacles = new Set(level.obstacles)
  const tileLayer = (name, occupied, tile) => ({
    id: id++, name, type: 'tilelayer', width: level.width, height: level.height, x: 0, y: 0, opacity: 1, visible: true,
    data: Array.from({ length: level.width * level.height }, (_, position) => occupied.has(position) ? tile : 0)
  })
  const objectLayer = (name, objects) => ({ id: id++, name, type: 'objectgroup', x: 0, y: 0, opacity: 1, visible: true, draworder: 'topdown', objects })
  const metadata = ['id', 'region', 'mapVersion', 'generatorVersion', 'threshold', 'sea', 'motif', 'planning']
  return {
    type: 'map', version: '1.10', tiledversion: '1.10.2', orientation: 'orthogonal', renderorder: 'right-down',
    width: level.width, height: level.height, tilewidth: TILE_SIZE, tileheight: TILE_SIZE, infinite: false,
    properties: [...metadata.filter(name => level[name] !== undefined).map(name => property(name, level[name])), ...(level.cut ? [property('cutAxis', level.cut.axis), property('cutPosition', level.cut.position), property('gates', JSON.stringify(level.gates))] : [])],
    tilesets: [{ firstgid: 1, name: 'terrain', tilewidth: TILE_SIZE, tileheight: TILE_SIZE, tilecount: 2, columns: 2, image: 'terrain.svg', imagewidth: 80, imageheight: 40, spacing: 0, margin: 0 }],
    layers: [
      tileLayer('floor', floor, 1), tileLayer('obstacles', obstacles, 2),
      objectLayer('targets', level.goals.map(goal => object(goal.country, goal.position, {
        country: goal.country, ...(goal.anchor ? { anchorX: goal.anchor[0], anchorY: goal.anchor[1] } : {})
      }))),
      objectLayer('flags', level.boxes.map(box => object(box.country, box.position, { country: box.country, boxId: box.id }))),
      objectLayer('player', [object('globe', level.player)])
    ], nextlayerid: 100, nextobjectid: 100
  }
}

export function fromTiled (map) {
  if (map?.orientation !== 'orthogonal' || map.infinite || map.tilewidth !== TILE_SIZE || map.tileheight !== TILE_SIZE) throw new Error('Use a finite orthogonal map with 40-pixel tiles')
  if (!Number.isInteger(map.width) || map.width < 1 || !Number.isInteger(map.height) || map.height < 1) throw new Error('Invalid map dimensions')
  const layer = name => {
    const layers = map.layers.filter(layer => layer.name === name)
    if (layers.length !== 1) throw new Error(`Expected one ${name} layer`)
    return layers[0]
  }
  const occupied = name => {
    const data = layer(name).data
    if (!Array.isArray(data) || data.length !== map.width * map.height) throw new Error(`Invalid ${name} tile layer`)
    return data.flatMap((tile, index) => tile ? [index] : [])
  }
  const position = object => {
    if (object.rotation !== 0 || object.x % TILE_SIZE !== 0 || object.y % TILE_SIZE !== 0) throw new Error('Objects must align with the tile grid and have no rotation')
    return object.y / TILE_SIZE * map.width + object.x / TILE_SIZE
  }
  const players = layer('player').objects
  if (players.length !== 1) throw new Error('Place exactly one player')
  const level = {
    ...properties(map), width: map.width, height: map.height,
    floors: occupied('floor'), obstacles: occupied('obstacles'), player: position(players[0]),
    boxes: layer('flags').objects.map(object => ({ id: properties(object).boxId, country: properties(object).country, position: position(object) })),
    goals: layer('targets').objects.map(object => {
      const data = properties(object)
      return { country: data.country, position: position(object), anchor: data.anchorX === undefined ? null : [data.anchorX, data.anchorY] }
    })
  }
  if (level.cutAxis) {
    level.cut = { axis: level.cutAxis, position: level.cutPosition }
    level.gates = JSON.parse(level.gates)
    delete level.cutAxis
    delete level.cutPosition
  }
  const errors = validateLevel(level)
  if (errors.length) throw new Error(errors.join('; '))
  return level
}
