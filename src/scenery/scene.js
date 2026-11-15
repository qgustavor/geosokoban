import atlas from '../content/scenery-atlas.json' with { type: 'json' }
import { PALETTES, paletteForEcoregion } from './palettes.js'

function seedFor (text) {
  let hash = 2166136261
  for (const character of text) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619)
  return hash >>> 0
}

/** Per-cell hashes isolate art choices from the generator and from one another. */
export function createScenery (level, data = atlas) {
  const candidate = data.regions?.[level.region]
  const map = data.mapVersion === level.mapVersion && candidate?.width === level.width && candidate?.height === level.height ? candidate : null
  const targets = new Set(level.goals.map(goal => goal.position))
  const obstacles = new Set(level.obstacles)
  const seed = `${level.id}:scenery-v1:`
  const tiles = new Map()
  const props = []
  const details = []
  for (const position of level.floors) {
    const cell = map?.cells[position]
    const record = data.ecoregions?.[cell?.[0]]
    const classified = !!record && (cell?.[2] ?? 0) >= 0.5
    const paletteName = level.sea ? 'sea' : classified ? paletteForEcoregion(record) : 'neutral'
    const palette = PALETTES[paletteName]
    const hash = seedFor(seed + position)
    tiles.set(position, { palette: paletteName, ground: palette.ground, edge: palette.edge, classified })
    if (obstacles.has(position)) {
      props.push({ position, kind: palette.obstacles[hash % palette.obstacles.length], flip: (hash >>> 8) % 2 === 0 })
    } else if (!targets.has(position) && !level.sea && (hash >>> 12) % 100 < 28) {
      details.push({ position, kind: palette.details[(hash >>> 16) % palette.details.length], corner: (hash >>> 24) % 4, phase: (hash % 21) / 10 })
    }
  }
  return { tiles, obstacles: props, details, classified: !!map }
}
