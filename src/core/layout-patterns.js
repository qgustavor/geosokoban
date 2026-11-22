import { addGoalGatePattern } from './challenge.js'
import { DIRECTIONS, neighbor } from './engine.js'
import { growTerrain, connectedTerrain } from './terrain.js'

export const LAYOUT_FAMILIES = ['ridges', 'groves', 'outcrops']

/** Grow offset, uneven groups instead of repeating rectangular construction stamps. */
function layoutStamps (base, rng, family) {
  const floor = new Set(base.floors)
  return base.floors.map(position => ({ position, order: rng() }))
    .sort((a, b) => a.order - b.order)
    .map(({ position }) => growTerrain(base, position, floor, rng,
      (family === 'outcrops' ? 2 : 4) + Math.floor(rng() * 3), family === 'ridges'))
}

/** Spacious structures share the map with its natural coastline and islands. */
export function addPuzzleLayout (base, rng, family, style) {
  const gatePocket = ['delivery-order', 'parking'].includes(style)
  const layout = gatePocket ? addGoalGatePattern(base, rng) : base
  if (!layout) return null

  const obstacles = new Set(layout.obstacles)
  const protectedCells = new Set(base.goals.map(goal => goal.position))

  // Keep turning space around destinations. The pocket's gate is the one
  // deliberate exception, and is already present before independent stamps.
  for (let step = 0; step < 2; step++) {
    for (const cell of [...protectedCells]) {
      for (const direction of DIRECTIONS) {
        const next = neighbor(base, cell, direction)
        if (next >= 0) protectedCells.add(next)
      }
    }
  }

  const clusters = []
  const desired = 2

  for (const cells of layoutStamps(base, rng, family)) {
    if (cells.some(cell => protectedCells.has(cell) || obstacles.has(cell))) continue

    // Independent structures leave a two-tile aisle where land permits, so a
    // flag does not consume the player's only way around the next obstacle.
    const crowdsStructure = cells.some(cell => DIRECTIONS.some(direction => {
      const next = neighbor(base, cell, direction)
      return next >= 0 && (obstacles.has(next) || DIRECTIONS.some(side => obstacles.has(neighbor(base, next, side))))
    }))
    if (crowdsStructure) continue

    const candidate = new Set([...obstacles, ...cells])
    if (!connectedTerrain({ ...base, obstacles: [...candidate] })) continue

    for (const cell of cells) obstacles.add(cell)
    clusters.push(cells)
    if (clusters.length >= desired) break
  }

  // Coastlines can supply the routing problem without extra artificial walls.
  return {
    ...layout,
    obstacles: [...obstacles].sort((a, b) => a - b),
    motif: family,
    layout: { family, style, clusters, gatePocket }
  }
}
