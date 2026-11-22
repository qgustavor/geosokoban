import { addGoalGatePattern } from './challenge.js'
import { DIRECTIONS, neighbor, walkable, initialState, move } from './engine.js'
import { gridDistance } from './placement.js'

export const LAYOUT_FAMILIES = ['switchbacks', 'courtyards', 'staggered-rooms', 'islands']

const SHAPES = {
  switchbacks: [[[0, 0], [1, 0], [2, 0], [2, 1]], [[0, 0], [0, 1], [1, 1], [1, 2]]],
  courtyards: [[[0, 0], [0, 1], [0, 2], [1, 2], [2, 2], [3, 2], [3, 1], [3, 0]]],
  'staggered-rooms': [[[0, 0], [1, 0], [2, 0], [3, 0]], [[0, 0], [0, 1], [0, 2], [0, 3]]],
  islands: [[[0, 0], [1, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [0, 1]]]
}

function layoutConnected (base, obstacles) {
  const open = walkable({ ...base, obstacles: [...obstacles] })
  const queue = [base.goals[0].position]
  const seen = new Set(queue)

  for (let i = 0; i < queue.length; i++) {
    for (const direction of DIRECTIONS) {
      const next = neighbor(base, queue[i], direction)

      if (open.has(next) && !seen.has(next)) {
        seen.add(next)
        queue.push(next)
      }
    }
  }

  // Small disconnected floor fragments are tolerated, but every destination
  // must belong to the main walking area while no flags occupy the passages.
  return seen.size >= open.size * 0.9 && base.goals.every(goal => seen.has(goal.position))
}

/** Deterministic polyomino stamps; never wrap a stamp across the grid boundary. */
function layoutStamps (base, rng, family) {
  const shapes = SHAPES[family]
  if (!shapes) throw new RangeError('Unknown layout family')

  const floor = new Set(base.floors)

  // Independent random priorities shuffle floor anchors before shapes and rotations are selected.
  const anchors = base.floors.map(position => ({ position, order: rng() })).sort((a, b) => a.order - b.order)

  return anchors.map(({ position }) => {
    const shape = shapes[Math.floor(rng() * shapes.length)]
    const rotate = Math.floor(rng() * 4)
    const points = shape.map(([x, y]) => {
      // Rotate offsets about the anchor, not about the whole board.
      if (rotate === 0) return [x, y]
      if (rotate === 1) return [-y, x]
      if (rotate === 2) return [-x, -y]
      return [y, -x]
    })
    const x = position % base.width
    const y = Math.floor(position / base.width)
    const crossesBoundary = points.some(([dx, dy]) => {
      const column = x + dx
      const row = y + dy
      return column < 0 || column >= base.width || row < 0 || row >= base.height
    })

    // Check coordinates before flattening: an out-of-range column could
    // otherwise masquerade as a valid cell on the next or previous row.
    if (crossesBoundary) return null

    const cells = points.map(([dx, dy]) => (y + dy) * base.width + x + dx)
    return cells.every(cell => floor.has(cell)) ? cells : null
  }).filter(Boolean)
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
    if (!layoutConnected(base, candidate)) continue

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

/** Remove independent stamps remote from every flag route in a verified plan. */
export function trimUnusedClusters (level, directions) {
  const routes = new Set(level.boxes.map(box => box.position))
  let state = initialState(level)
  const floor = walkable(level)

  for (const direction of directions) {
    state = move(level, state, direction, floor)
    for (const box of state.boxes) routes.add(box.position)
  }

  const clusters = level.layout.clusters.filter(cells => {
    return cells.some(cell => [...routes].some(position => gridDistance(level, cell, position) <= 2))
  })
  if (clusters.length === level.layout.clusters.length) return level

  const removed = new Set(level.layout.clusters.filter(cells => !clusters.includes(cells)).flat())
  return {
    ...level,
    obstacles: level.obstacles.filter(position => !removed.has(position)),
    layout: { ...level.layout, clusters }
  }
}
