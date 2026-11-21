import { DIRECTIONS, neighbor, walkable } from './engine.js'
import { reverseDistances } from './solver.js'

export const CHALLENGES = ['easy', 'medium', 'hard']

export function challengeSettings (value) {
  // Easy and Medium share a puzzle family; Hard also enables planning constraints.
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

const coordinate = (level, position, axis) => axis === 'x' ? position % level.width : Math.floor(position / level.width)

export function challengeDistances (level) {
  const floor = walkable(level)

  return new Map(level.goals.map(goal => [goal.country, reverseDistances(level, goal, floor)]))
}

export function pushLowerBound (distances, state) {
  // Independent-flag distances ignore interference from other flags, so their sum is only a lower bound.
  return state.boxes.reduce((sum, box) => {
    // An absent route remains impossible, rather than contributing zero pushes.
    const minimumPushes = distances.get(box.country)?.get(box.position) ?? Infinity

    return sum + minimumPushes
  }, 0)
}

/** A destination in a narrow passage creates a real delivery-order decision. */
export function addGoalGatePattern (base, rng, planning) {
  const floor = new Set(base.floors)
  const candidates = []

  for (const goal of base.goals) {
    for (const axis of ['x', 'y']) {
      const crossingDirections = axis === 'x' ? ['left', 'right'] : ['up', 'down']
      const cut = coordinate(base, goal.position, axis)
      const hasPushSpace = crossingDirections.every(direction => {
        const adjacent = neighbor(base, goal.position, direction)
        if (!floor.has(adjacent)) return false

        const support = neighbor(base, adjacent, direction)

        return floor.has(support)
      })
      if (!hasPushSpace) continue

      const crowdsOtherGoal = base.goals.some(other => {
        if (other === goal) return false

        const distanceFromCut = Math.abs(coordinate(base, other.position, axis) - cut)

        return distanceFromCut <= 1
      })
      if (crowdsOtherGoal) continue

      const line = base.floors.filter(position => coordinate(base, position, axis) === cut)
      if (line.length < 4) continue

      // The destination is the only opening: a delivered flag can block passage until moved again.
      const obstacles = line.filter(position => position !== goal.position)
      const level = {
        ...base,
        obstacles,
        gates: [goal.position],
        cut: { axis, position: cut },
        motif: planning ? 'parking-gate' : 'delivery-order',
        planning
      }

      const open = walkable(level)
      const area = new Set([goal.position])
      const queue = [...area]

      for (let i = 0; i < queue.length; i++) {
        for (const direction of DIRECTIONS) {
          const next = neighbor(base, queue[i], direction)
          if (open.has(next) && !area.has(next)) {
            area.add(next)
            queue.push(next)
          }
        }
      }

      // Check access with the gate empty; occupying it later creates the delivery-order constraint.
      const reachesMostFloor = area.size >= open.size * 0.85
      if (!reachesMostFloor) continue

      const reachesEveryGoal = base.goals.every(other => area.has(other.position))
      if (reachesEveryGoal) candidates.push(level)
    }
  }

  if (!candidates.length) return null

  return candidates[Math.floor(rng() * candidates.length)]
}
