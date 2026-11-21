import { addGoalGatePattern } from './challenge.js'
import { DIRECTIONS, neighbor, walkable } from './engine.js'

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

/** Bent partitions plus independently placed rooms, baffles or obstacle islands. */
export function addPuzzleLayout (base, rng, planning, family) {
  const gate = addGoalGatePattern(base, rng, planning)
  if (!gate) return null

  const floor = new Set(base.floors)
  const { axis, position: cut } = gate.cut

  // Express either orientation in partition coordinates: across measures the
  // barrier's displacement, along advances from one end of the barrier to the other.
  const across = position => axis === 'x' ? position % base.width : Math.floor(position / base.width)
  const along = position => axis === 'x' ? Math.floor(position / base.width) : position % base.width
  const position = (a, b) => axis === 'x' ? b * base.width + a : a * base.width + b
  const gateAlong = along(gate.gates[0])
  const span = axis === 'x' ? base.height : base.width
  const acrossSpan = axis === 'x' ? base.width : base.height
  const sign = rng() < 0.5 ? -1 : 1
  const period = 3 + Math.floor(rng() * 3)
  const obstacles = new Set()
  let previous = cut

  for (let t = 0; t < span; t++) {
    // Leave the gate's immediate approach straight; farther away, alternate
    // the barrier's offset to create bends without touching the outer edge.
    const nearGate = Math.abs(t - gateAlong) <= 2
    const delta = nearGate ? 0 : sign * (1 + Math.floor(t / period) % 2)
    const current = Math.max(1, Math.min(acrossSpan - 2, cut + delta))

    // Join successive slices to avoid diagonal holes in a stepped partition.
    const sliceStart = Math.min(previous, current)
    const sliceEnd = Math.max(previous, current)

    for (let a = sliceStart; a <= sliceEnd; a++) {
      const cell = position(a, t)
      if (floor.has(cell) && cell !== gate.gates[0]) obstacles.add(cell)
    }

    previous = current
  }

  const protectedCells = new Set(base.goals.flatMap(goal => {
    const neighbors = DIRECTIONS.map(direction => neighbor(base, goal.position, direction))
    return [goal.position, ...neighbors]
  }))
  const blocksProtectedApproach = [...obstacles].some(cell => {
    if (!protectedCells.has(cell)) return false

    // The two slices beside the gate may form its walls. Other protected
    // destination approaches must remain clear of the bent partition.
    const alongPosition = along(cell)
    return alongPosition !== gateAlong - 1 && alongPosition !== gateAlong + 1
  })

  if (blocksProtectedApproach) return null
  if (base.goals.some(goal => obstacles.has(goal.position)) || !layoutConnected(base, obstacles)) return null

  const clusters = []
  const desired = planning ? 4 : 3

  for (const cells of layoutStamps(base, rng, family)) {
    if (cells.some(cell => protectedCells.has(cell) || obstacles.has(cell))) continue

    // Keep a usable aisle around independent structures rather than dense noise.
    const touchesExistingObstacle = cells.some(cell =>
      DIRECTIONS.some(direction => obstacles.has(neighbor(base, cell, direction)))
    )
    if (touchesExistingObstacle) continue

    const candidate = new Set([...obstacles, ...cells])
    if (!layoutConnected(base, candidate)) continue

    for (const cell of cells) obstacles.add(cell)
    clusters.push(cells)
    if (clusters.length >= desired) break
  }

  const offAxis = [...obstacles].filter(cell => across(cell) !== cut).length
  if (!clusters.length || offAxis < 4) return null

  return {
    ...gate,
    obstacles: [...obstacles].sort((a, b) => a - b),
    motif: family,
    layout: { family, clusters, bentPartition: true }
  }
}
