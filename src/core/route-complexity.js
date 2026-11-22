import { DIRECTIONS, OPPOSITE, neighbor, walkable } from './engine.js'

/**
 * A lower bound on direction changes over ALL single-flag routes, not just a
 * solver's chosen plan. Ignore other flags and walking between pushing sides;
 * retain walls and the support square required for each individual push.
 * A real solution cannot use fewer turns than this relaxed search.
 */
export function minimumRouteTurns (level, box, floor = walkable(level)) {
  const goal = level.goals.find(goal => goal.country === box.country)
  if (!goal || !floor.has(box.position) || !floor.has(goal.position)) return Infinity
  if (box.position === goal.position) return 0

  const best = new Int32Array(level.width * level.height * 4).fill(-1)
  const buckets = [[]]

  // The first push is free to choose its direction; only subsequent changes count.
  for (let direction = 0; direction < 4; direction++) {
    const key = box.position * 4 + direction
    best[key] = 0
    buckets[0].push(key)
  }

  // Edges cost zero (continue straight) or one (turn). Cost buckets process
  // every reachable position/direction at its minimum, with no search cutoff.
  for (let turns = 0; turns < buckets.length; turns++) {
    const queue = buckets[turns]
    if (!queue) continue

    for (let cursor = 0; cursor < queue.length; cursor++) {
      const key = queue[cursor]
      if (best[key] !== turns) continue
      const position = Math.floor(key / 4)
      if (position === goal.position) return turns

      DIRECTIONS.forEach((direction, index) => {
        const next = neighbor(level, position, direction)
        const support = neighbor(level, position, OPPOSITE[direction])
        if (!floor.has(next) || !floor.has(support)) return

        const cost = turns + Number(index !== key % 4)
        const signature = next * 4 + index
        if (best[signature] !== -1 && best[signature] <= cost) return
        best[signature] = cost
        buckets[cost] ??= []
        buckets[cost].push(signature)
      })
    }
  }

  return Infinity
}
