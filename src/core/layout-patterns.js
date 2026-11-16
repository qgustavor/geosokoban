import { addGoalGatePattern } from './challenge.js'
import { DIRECTIONS, neighbor, walkable } from './engine.js'

export const LAYOUT_FAMILIES = ['switchbacks', 'courtyards', 'staggered-rooms', 'islands']

const SHAPES = {
  switchbacks: [[[0, 0], [1, 0], [2, 0], [2, 1]], [[0, 0], [0, 1], [1, 1], [1, 2]]],
  courtyards: [[[0, 0], [0, 1], [0, 2], [1, 2], [2, 2], [3, 2], [3, 1], [3, 0]]],
  'staggered-rooms': [[[0, 0], [1, 0], [2, 0], [3, 0]], [[0, 0], [0, 1], [0, 2], [0, 3]]],
  islands: [[[0, 0], [1, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [0, 1]]]
}

export function layoutConnected (base, obstacles) {
  const open = walkable({ ...base, obstacles: [...obstacles] })
  const queue = [base.goals[0].position]
  const seen = new Set(queue)
  for (let i = 0; i < queue.length; i++) {
    for (const direction of DIRECTIONS) {
      const next = neighbor(base, queue[i], direction)
      if (open.has(next) && !seen.has(next)) { seen.add(next); queue.push(next) }
    }
  }
  return seen.size >= open.size * 0.9 && base.goals.every(goal => seen.has(goal.position))
}

/** Deterministic polyomino stamps; never wrap a stamp across the grid boundary. */
export function layoutStamps (base, rng, family) {
  const shapes = SHAPES[family]
  if (!shapes) throw new RangeError('Unknown layout family')
  const floor = new Set(base.floors)
  const anchors = base.floors.map(position => ({ position, order: rng() })).sort((a, b) => a.order - b.order)
  return anchors.map(({ position }) => {
    const shape = shapes[Math.floor(rng() * shapes.length)]
    const rotate = Math.floor(rng() * 4)
    const points = shape.map(([x, y]) => rotate === 0 ? [x, y] : rotate === 1 ? [-y, x] : rotate === 2 ? [-x, -y] : [y, -x])
    const x = position % base.width
    const y = Math.floor(position / base.width)
    if (points.some(([dx, dy]) => x + dx < 0 || x + dx >= base.width || y + dy < 0 || y + dy >= base.height)) return null
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
    const delta = Math.abs(t - gateAlong) <= 2 ? 0 : sign * (1 + Math.floor(t / period) % 2)
    const current = Math.max(1, Math.min(acrossSpan - 2, cut + delta))
    // Join successive slices to avoid diagonal holes in a stepped partition.
    for (let a = Math.min(previous, current); a <= Math.max(previous, current); a++) {
      const cell = position(a, t)
      if (floor.has(cell) && cell !== gate.gates[0]) obstacles.add(cell)
    }
    previous = current
  }
  const protectedCells = new Set(base.goals.flatMap(goal => [goal.position, ...DIRECTIONS.map(direction => neighbor(base, goal.position, direction))]))
  if ([...obstacles].some(cell => protectedCells.has(cell) && along(cell) !== gateAlong - 1 && along(cell) !== gateAlong + 1)) return null
  if (base.goals.some(goal => obstacles.has(goal.position)) || !layoutConnected(base, obstacles)) return null
  const clusters = []
  const desired = planning ? 4 : 3
  for (const cells of layoutStamps(base, rng, family)) {
    if (cells.some(cell => protectedCells.has(cell) || obstacles.has(cell))) continue
    // Keep a usable aisle around independent structures rather than dense noise.
    if (cells.some(cell => DIRECTIONS.some(direction => obstacles.has(neighbor(base, cell, direction))))) continue
    const candidate = new Set([...obstacles, ...cells])
    if (!layoutConnected(base, candidate)) continue
    for (const cell of cells) obstacles.add(cell)
    clusters.push(cells)
    if (clusters.length >= desired) break
  }
  const offAxis = [...obstacles].filter(cell => across(cell) !== cut).length
  if (!clusters.length || offAxis < 4) return null
  return { ...gate, obstacles: [...obstacles].sort((a, b) => a - b), motif: family, layout: { family, clusters, bentPartition: true } }
}
