import atlas from '../content/scenery-atlas.json' with { type: 'json' }
import { PALETTES, paletteForEcoregion } from './palettes.js'

function seedFor (text) {
  let hash = 2166136261

  // Hash each cell independently so movement and rendering order cannot change its artwork.
  for (const character of text) {
    const mixed = hash ^ character.charCodeAt(0)
    hash = Math.imul(mixed, 16777619)
  }

  // Modulo selects palette entries below, so the hash must be unsigned.
  return hash >>> 0
}

/** Per-cell hashes isolate art choices from the generator and from one another. */
export function createScenery (level, data = atlas) {
  const candidate = data.regions?.[level.region]
  // Atlas cells are board indices: a different projection or grid size would misplace their biomes.
  const matchesProjection = data.mapVersion === level.mapVersion &&
    candidate?.width === level.width &&
    candidate?.height === level.height
  const map = matchesProjection ? candidate : null

  const targets = new Set(level.goals.map(goal => goal.position))
  const obstacles = new Set(level.obstacles)
  // This art-only namespace must not consume the puzzle generator's random sequence.
  const seed = `${level.id}:scenery-v1:`
  const tiles = new Map()
  const props = []
  const details = []

  for (const position of level.floors) {
    const cell = map?.cells[position]
    // Cells store [primary ecoregion ID, classified land fraction].
    // Use only the primary region, and require half the sampled land to be classified, not half the whole tile.
    const record = data.ecoregions?.[cell?.[0]]
    const classified = !!record && (cell?.[1] ?? 0) >= 0.5

    // Boat puzzles always use water art, even when the atlas classifies land underneath that cell.
    let paletteName = 'neutral'
    if (level.sea) paletteName = 'sea'
    else if (classified) paletteName = paletteForEcoregion(record)

    const palette = PALETTES[paletteName]
    const hash = seedFor(seed + position)

    tiles.set(position, {
      palette: paletteName,
      ground: palette.ground,
      edge: palette.edge,
      classified
    })

    // Blocking artwork only decorates an existing obstacle; it never creates a gameplay barrier.
    if (obstacles.has(position)) {
      const kind = palette.obstacles[hash % palette.obstacles.length]
      const flip = (hash >>> 8) % 2 === 0

      props.push({ position, kind, flip })
      continue
    }

    // Keep destinations unobscured and avoid placing land details on navigable water.
    if (targets.has(position) || level.sea) continue

    // Fixed hash slices keep each choice stable when other cells are added, removed, or reordered.
    const detailRoll = (hash >>> 12) % 100
    if (detailRoll >= 28) continue

    const kind = palette.details[(hash >>> 16) % palette.details.length]
    const corner = (hash >>> 24) % 4
    // GroundDetail uses this 0–2 second offset as a negative animation delay to stagger idle motion.
    const phase = (hash % 21) / 10

    details.push({ position, kind, corner, phase })
  }

  // Scene-level classification means an aligned atlas exists, not that every tile passed the coverage check.
  return { tiles, obstacles: props, details, classified: !!map }
}
