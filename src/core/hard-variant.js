import { DIRECTIONS, neighbor, initialState, move, walkable } from './engine.js'
import { challengeDistances } from './challenge.js'
import { gridDistance } from './placement.js'
import { minimumRouteTurns } from './route-complexity.js'

// Short local structures, not another goal gate or a map-wide partition.
const ROUTING_SHAPES = [
  [[0, 0], [1, 0]],
  [[0, 0], [1, 0], [2, 0]],
  [[0, 0], [1, 0], [0, 1]],
  [[0, 0], [1, 0], [0, 1], [1, 1]],
  [[0, 0], [1, 0], [2, 0], [2, 1]],
  [[0, 0], [1, 0], [1, 1], [2, 1]]
]

function connected (level, floor) {
  const queue = [level.player]
  const seen = new Set(queue)

  for (let cursor = 0; cursor < queue.length; cursor++) {
    for (const direction of DIRECTIONS) {
      const next = neighbor(level, queue[cursor], direction)
      if (!floor.has(next) || seen.has(next)) continue
      seen.add(next)
      queue.push(next)
    }
  }

  const actors = [...level.boxes, ...level.goals]
  return seen.size >= floor.size * 0.9 && actors.every(actor => seen.has(actor.position))
}

/** Modify a route, not its length alone. Starts and geographic destinations stay put. */
export function * hardCandidates (level, rng, quality) {
  const floor = walkable(level)
  const distances = challengeDistances(level)
  const protectedCells = new Set([level.player])
  for (const actor of [...level.boxes, ...level.goals]) {
    protectedCells.add(actor.position)
    for (const direction of DIRECTIONS) protectedCells.add(neighbor(level, actor.position, direction))
  }

  // Concentrate candidates on actual deliveries and their pushing approaches.
  const route = new Set()
  let state = initialState(level)
  for (const direction of level.solution) {
    const next = move(level, state, direction, floor)
    if (next.pushes !== state.pushes) {
      route.add(state.player)
      next.boxes.forEach((box, index) => {
        if (box.position !== state.boxes[index].position) route.add(box.position)
      })
    }
    state = next
  }

  const anchors = [...route].map(position => ({ position, order: rng() })).sort((a, b) => a.order - b.order)
  const shapes = ROUTING_SHAPES.map(shape => ({ shape, order: rng() })).sort((a, b) => a.order - b.order)
  const seen = new Set()
  let offered = 0

  for (const { position } of anchors) {
    for (const { shape } of shapes) {
      for (let rotation = 0; rotation < 4; rotation++) {
        const cells = shape.map(([dx, dy]) => {
          const [x, y] = [[dx, dy], [-dy, dx], [-dx, -dy], [dy, -dx]][rotation]
          const column = position % level.width + x
          const row = Math.floor(position / level.width) + y
          if (column < 0 || row < 0 || column >= level.width || row >= level.height) return -1
          return row * level.width + column
        }).sort((a, b) => a - b)
        const key = cells.join(',')
        if (seen.has(key)) continue
        seen.add(key)
        if (cells.some(cell => !floor.has(cell) || protectedCells.has(cell))) continue
        if (cells.some(cell => level.obstacles.some(wall => gridDistance(level, cell, wall) <= 1))) continue

        const candidate = {
          ...level,
          id: `${level.id}-hard`,
          planning: true,
          obstacles: [...level.obstacles, ...cells].sort((a, b) => a - b),
          layout: { ...level.layout, clusters: [...level.layout.clusters, cells] }
        }
        const open = walkable(candidate)
        if (!connected(candidate, open)) continue
        const bounds = challengeDistances(candidate)
        const increases = level.boxes.map(box => {
          return (bounds.get(box.country).get(box.position) ?? Infinity) - distances.get(box.country).get(box.position)
        })
        if (increases.reduce((sum, value) => sum + value, 0) > 4) continue

        // Compare a lower bound over all Hard routes with an actual, legal
        // standard plan. More bends in one arbitrary solver path cannot pass.
        const addsDecision = level.boxes.some(box => {
          const turns = minimumRouteTurns(candidate, box, open)
          const standardTurns = quality.perFlagTurns[box.country]
          return turns > standardTurns && turns <= standardTurns + 2
        })
        if (!addsDecision) continue

        yield candidate
        if (++offered >= 48) return
      }
    }
  }
}
