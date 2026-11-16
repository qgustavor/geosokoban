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
  const base = code.replace(/-P$|-hard$/, '')
  const suffix = base.startsWith('G2-') ? '-P' : '-hard'

  return base + (planning ? suffix : '')
}

const coordinate = (level, position, axis) => axis === 'x' ? position % level.width : Math.floor(position / level.width)

/** A cut across the island creates one commitment gate or two alternating routes. */
export function addChallengePattern (base, rng, motif) {
  const floor = new Set(base.floors)
  const axis = rng() < 0.5 ? 'x' : 'y'
  const span = axis === 'x' ? base.width : base.height
  const crossingDirections = axis === 'x' ? ['left', 'right'] : ['up', 'down']
  const alongAxis = axis === 'x' ? 'y' : 'x'
  const candidates = []

  for (let cut = 3; cut < span - 3; cut++) {
    // Put destinations on both sides so the barrier separates useful parts of the board.
    const hasGoalBeforeCut = base.goals.some(goal => coordinate(base, goal.position, axis) < cut - 1)
    if (!hasGoalBeforeCut) continue

    const hasGoalAfterCut = base.goals.some(goal => coordinate(base, goal.position, axis) > cut + 1)
    if (!hasGoalAfterCut) continue

    const line = base.floors.filter(position => coordinate(base, position, axis) === cut)
    if (line.length < 4) continue

    // Keep the barrier off destinations and their immediately adjacent approach cells.
    const goalTouchesCut = base.goals.some(goal => Math.abs(coordinate(base, goal.position, axis) - cut) <= 1)
    if (goalTouchesCut) continue

    const openings = line.filter(position => {
      const hasOpenNeighbors = DIRECTIONS.every(direction => floor.has(neighbor(base, position, direction)))
      if (!hasOpenNeighbors) return false

      // Crossing a gate needs space for both the flag and the player pushing behind it.
      return crossingDirections.every(direction => {
        const adjacent = neighbor(base, position, direction)
        const support = neighbor(base, adjacent, direction)

        return floor.has(support)
      })
    })

    for (const first of openings) {
      // Two separated gates offer distinct routes rather than one wide doorway.
      const others = motif === 'sliding-door'
        ? openings.filter(position => {
          const firstAlong = coordinate(base, first, alongAxis)
          const otherAlong = coordinate(base, position, alongAxis)

          return Math.abs(firstAlong - otherAlong) >= 3
        })
        : [null]

      for (const second of others) {
        // A pair describes the same barrier in either order; keep it only once.
        if (second !== null && second < first) continue

        const gates = second === null ? [first] : [first, second]
        const obstacles = line.filter(position => !gates.includes(position))
        const next = { ...base, obstacles, motif, planning: true, gates, cut: { axis, position: cut } }
        candidates.push(next)
      }
    }
  }

  while (candidates.length) {
    // Sample without replacement. The swap-and-pop order also determines seeded results.
    const index = Math.floor(rng() * candidates.length)
    const next = candidates[index]
    candidates[index] = candidates.at(-1)
    candidates.pop()

    const open = walkable(next)
    const area = new Set([base.goals[0].position])
    const queue = [...area]

    for (let cursor = 0; cursor < queue.length; cursor++) {
      for (const direction of DIRECTIONS) {
        const position = neighbor(next, queue[cursor], direction)
        if (open.has(position) && !area.has(position)) {
          area.add(position)
          queue.push(position)
        }
      }
    }

    // All destinations must share the main area, but small disconnected floor fragments may remain.
    const reachesMostFloor = area.size >= open.size * 0.85
    if (!reachesMostFloor) continue

    const reachesEveryGoal = base.goals.every(goal => area.has(goal.position))
    if (reachesEveryGoal) return next
  }

  return null
}

/** At least one flag starts across the barrier from its own destination. */
export function crossesChallengeGate (level, state) {
  if (!level.gates?.length || !level.cut) return false

  return state.boxes.some(box => {
    const goal = level.goals.find(goal => goal.country === box.country)
    const boxOffset = coordinate(level, box.position, level.cut.axis) - level.cut.position
    const goalOffset = coordinate(level, goal.position, level.cut.axis) - level.cut.position

    // Opposite signs mean opposite sides; a flag or destination on the cut does not count.
    return boxOffset * goalOffset < 0
  })
}

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
