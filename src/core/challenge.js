import { DIRECTIONS, neighbor, walkable } from './engine.js'
import { reverseDistances } from './solver.js'

export const CHALLENGES = ['easy', 'medium', 'hard']

export function challengeSettings (value) {
  // Easy and Medium share a board; Hard adds a modest terrain-routing decision.
  const guidance = ['medium', 'hard'].includes(value) ? 'remember' : 'learn'
  const planning = value === 'hard'

  return { guidance, planning }
}

export function challengeName (guidance, planning) {
  if (planning) return 'hard'

  return guidance === 'remember' ? 'medium' : 'easy'
}

export function withPlanning (code, planning) {
  return code.replace(/-hard$/, '') + (planning ? '-hard' : '')
}

export function challengeDistances (level) {
  const floor = walkable(level)

  return new Map(level.goals.map(goal => [goal.country, reverseDistances(level, goal, floor)]))
}

/** A small one-exit working area, rather than a barrier spanning the whole map. */
export function addGoalGatePattern (base, rng) {
  const floor = new Set(base.floors)
  const candidates = []

  for (const goal of base.goals) {
    for (const direction of DIRECTIONS) {
      const axis = ['left', 'right'].includes(direction) ? 'x' : 'y'
      const sign = ['left', 'up'].includes(direction) ? -1 : 1
      const gx = goal.position % base.width
      const gy = Math.floor(goal.position / base.width)
      const position = (depth, side) => {
        const x = gx + (axis === 'x' ? sign * depth : side)
        const y = gy + (axis === 'y' ? sign * depth : side)
        if (x < 0 || y < 0 || x >= base.width || y >= base.height) return -1
        return y * base.width + x
      }

      // Two cells behind the mouth allow a reverse pull into the pocket;
      // two in front leave room to approach, push through, and park beside it.
      if (![-2, -1, 1, 2].every(depth => floor.has(position(depth, 0)))) continue

      for (const depth of [4, 5]) {
        const obstacles = new Set()
        const pocket = new Set()

        for (let d = 0; d <= depth; d++) {
          for (let side = -3; side <= 3; side++) {
            const cell = position(d, side)
            if (!floor.has(cell) || cell === goal.position) continue
            if (d === 0 || d === depth || Math.abs(side) === 3) obstacles.add(cell)
            else pocket.add(cell)
          }
        }

        // Do not cage a different destination or crowd its pushing approaches.
        const crowdsGoal = base.goals.some(other => {
          if (other === goal) return false
          return pocket.has(other.position) || obstacles.has(other.position) ||
            DIRECTIONS.some(side => obstacles.has(neighbor(base, other.position, side)))
        })
        if (crowdsGoal || pocket.size < 8) continue

        const level = {
          ...base,
          obstacles: [...obstacles],
          gates: [goal.position],
          cut: { axis, position: axis === 'x' ? gx : gy }
        }
        const open = walkable(level)
        const seen = new Set([goal.position])
        const queue = [...seen]

        for (let cursor = 0; cursor < queue.length; cursor++) {
          for (const side of DIRECTIONS) {
            const next = neighbor(base, queue[cursor], side)
            if (!open.has(next) || seen.has(next)) continue
            seen.add(next)
            queue.push(next)
          }
        }

        if (seen.size < open.size * 0.9 || base.goals.some(other => !seen.has(other.position))) continue

        // A pocket is useful only if a flag for another country can leave it.
        // Screen that route here rather than wasting whole scramble attempts
        // on mouths facing the wrong way or excessively distant destinations.
        const usable = base.goals.some(other => {
          if (other === goal) return false
          const distances = reverseDistances(level, other, open)
          return [...pocket].some(cell => (distances.get(cell) ?? Infinity) <= 16)
        })
        if (usable) candidates.push(level)
      }
    }
  }

  return candidates.length ? candidates[Math.floor(rng() * candidates.length)] : null
}
