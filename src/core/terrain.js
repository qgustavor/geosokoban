import { DIRECTIONS, neighbor, walkable, initialState, move } from './engine.js'
import { gridDistance } from './placement.js'

/** Small connected terrain, grown along a tendency rather than stamped as a wall. */
export function growTerrain (level, anchor, allowed, rng, size, ridge = false) {
  if (!allowed.has(anchor)) return []
  const cells = new Set([anchor])
  const horizontal = rng() < 0.5
  const ax = anchor % level.width
  const ay = Math.floor(anchor / level.width)

  while (cells.size < size) {
    const frontier = new Set()
    for (const cell of cells) {
      for (const direction of DIRECTIONS) {
        const next = neighbor(level, cell, direction)
        if (allowed.has(next) && !cells.has(next)) frontier.add(next)
      }
    }
    if (!frontier.size) break

    const options = [...frontier].filter(position => {
      if (cells.size < 3) return true
      const group = [...cells, position]
      const straight = group.every(cell => cell % level.width === anchor % level.width) ||
        group.every(cell => Math.floor(cell / level.width) === Math.floor(anchor / level.width))
      return !straight
    })
    if (!options.length) break
    const ranked = options.map(position => {
      const x = Math.abs(position % level.width - ax)
      const y = Math.abs(Math.floor(position / level.width) - ay)
      const neighbors = DIRECTIONS.filter(direction => cells.has(neighbor(level, position, direction))).length
      // Ridges can bend and thicken; clumps favor shared edges without becoming perfect squares.
      const shape = ridge ? (horizontal ? x - y : y - x) * 0.6 : neighbors * 0.7 - (x + y) * 0.3
      return { position, score: shape + rng() * 2 }
    }).sort((a, b) => b.score - a.score)
    cells.add(ranked[0].position)
  }

  return [...cells].sort((a, b) => a - b)
}

/** Check walking space, not solvability; flags are deliberately ignored here. */
export function connectedTerrain (level, floor = walkable(level)) {
  const start = level.player ?? level.goals[0].position
  if (!floor.has(start)) return false
  const seen = new Set([start])
  const queue = [start]
  for (let cursor = 0; cursor < queue.length; cursor++) {
    for (const direction of DIRECTIONS) {
      const next = neighbor(level, queue[cursor], direction)
      if (!floor.has(next) || seen.has(next)) continue
      seen.add(next)
      queue.push(next)
    }
  }
  return seen.size >= floor.size * 0.9 &&
    [...(level.boxes ?? []), ...level.goals].every(actor => seen.has(actor.position))
}

/** All walking and flag positions, including the support positions used to push. */
export function solutionSpace (level) {
  const floor = walkable(level)
  const occupied = new Set([level.player, ...level.boxes.map(box => box.position)])
  const deliveries = new Set()
  let state = initialState(level)
  for (const direction of level.solution) {
    const next = move(level, state, direction, floor)
    if (next === state) throw new Error('Terrain placement requires a legal solution')
    occupied.add(next.player)
    if (next.pushes > state.pushes) {
      deliveries.add(state.player)
      next.boxes.forEach((box, index) => {
        if (box.position !== state.boxes[index].position) {
          occupied.add(box.position)
          deliveries.add(box.position)
        }
      })
    }
    state = next
  }
  return { occupied, deliveries }
}

export function protectActors (level) {
  const protectedCells = new Set([level.player])
  for (const actor of [...level.boxes, ...level.goals]) {
    protectedCells.add(actor.position)
    for (const direction of DIRECTIONS) protectedCells.add(neighbor(level, actor.position, direction))
  }
  return protectedCells
}

/** Local routing additions. Full puzzle searches belong to the caller. */
export function * routingTerrain (level, rng, { hard = false, limit = 80 } = {}) {
  const floor = walkable(level)
  const protectedCells = protectActors(level)
  const allowed = new Set([...floor].filter(cell => !protectedCells.has(cell)))
  const route = [...solutionSpace(level).deliveries].filter(cell => allowed.has(cell))
  const anchors = route.map(position => ({ position, order: rng() })).sort((a, b) => a.order - b.order)
  const seen = new Set()
  let offered = 0

  for (let pass = 0; pass < 4; pass++) {
    for (const { position } of anchors) {
      const groups = []
      const free = new Set(allowed)
      const count = hard ? 2 + Number(rng() < 0.35) : 1
      let anchor = position
      for (let group = 0; group < count; group++) {
        const size = hard ? 3 + Math.floor(rng() * 4) : 2 + Math.floor(rng() * 2)
        const cells = growTerrain(level, anchor, free, rng, size, rng() < 0.6)
        if (cells.length < 2) break
        groups.push(cells)
        for (const cell of cells) {
          free.delete(cell)
          for (const direction of DIRECTIONS) free.delete(neighbor(level, cell, direction))
        }
        const alternatives = route.filter(cell => free.has(cell) &&
          groups.flat().every(wall => gridDistance(level, cell, wall) >= 4))
        if (!alternatives.length) break
        anchor = alternatives[Math.floor(rng() * alternatives.length)]
      }
      if (hard && groups.length < 2) continue
      const cells = groups.flat().sort((a, b) => a - b)
      const signature = cells.join(',')
      if (!cells.length || seen.has(signature)) continue
      seen.add(signature)
      const candidate = {
        ...level,
        obstacles: [...level.obstacles, ...cells].sort((a, b) => a - b),
        layout: { ...level.layout, clusters: [...level.layout.clusters, ...groups] }
      }
      if (!connectedTerrain(candidate)) continue
      yield candidate
      if (++offered >= limit) return
    }
  }
}

/** Blocking scenery outside the plans, retaining a one-tile recovery margin. */
export function decorateTerrain (level, rng, count, plans = [level]) {
  const reserved = protectActors(level)
  for (const plan of plans) {
    // Shared decoration must not overlap a routing obstacle in the other variant.
    for (const cell of plan.obstacles) reserved.add(cell)
    for (const cell of solutionSpace(plan).occupied) {
      reserved.add(cell)
      for (const direction of DIRECTIONS) reserved.add(neighbor(level, cell, direction))
    }
  }
  const original = walkable(level)
  const allowed = new Set([...original].filter(cell => !reserved.has(cell)))
  // Edges and unused regions get scenery first. It is not required to add a detour.
  const anchors = [...allowed].map(position => {
    const edge = DIRECTIONS.filter(direction => !original.has(neighbor(level, position, direction))).length
    return { position, score: edge * 2 + rng() * 3 }
  }).sort((a, b) => b.score - a.score)
  let decorated = level
  const added = []

  for (const { position } of anchors) {
    if (!allowed.has(position) || added.length >= count) continue
    const size = Math.min(count - added.length, 1 + Math.floor(rng() * 3))
    const cells = growTerrain(level, position, allowed, rng, size, false)
    const candidate = { ...decorated, obstacles: [...decorated.obstacles, ...cells].sort((a, b) => a - b) }
    if (!connectedTerrain(candidate)) continue
    decorated = candidate
    added.push(...cells)
    // Leave space between peripheral groups; do not lace the coast with a solid wall.
    for (const cell of cells) {
      allowed.delete(cell)
      for (const direction of DIRECTIONS) allowed.delete(neighbor(level, cell, direction))
    }
  }
  return {
    ...decorated,
    layout: { ...level.layout, decoration: [...(level.layout.decoration ?? []), ...added] }
  }
}
