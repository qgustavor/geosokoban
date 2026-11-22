import { initialState, move, walkable } from './engine.js'
import { reverseDistances } from './solver.js'

// Level geometry is immutable during a search. Cache the expensive closed-goal
// distance maps, not the answer (which depends on the current box positions).
const dependencyDistances = new WeakMap()

/** A filled destination can close a route needed by a different flag. */
export function goalDependencies (level, state = initialState(level)) {
  let checks = dependencyDistances.get(level)

  if (!checks) {
    const floor = walkable(level)
    checks = level.goals.flatMap(gate => {
      // Treat a delivered flag as a wall to find which other deliveries would lose their route.
      const closed = new Set(floor)
      closed.delete(gate.position)

      const otherGoals = level.goals.filter(goal => goal.country !== gate.country)

      return otherGoals.map(goal => ({
        before: goal.country,
        after: gate.country,
        distances: reverseDistances(level, goal, closed)
      }))
    })

    dependencyDistances.set(level, checks)
  }

  // Recheck box positions on every call: only the closed-gate geometry is cached.
  const blockedDeliveries = checks.filter(check => {
    const box = state.boxes.find(box => box.country === check.before)

    return box && !check.distances.has(box.position)
  })

  return blockedDeliveries.map(({ before, after }) => ({ before, after }))
}

/** Metrics describe a verified solution, not a human difficulty rating or a proof of necessity. */
export function analyzeDesign (level, directions) {
  const floor = walkable(level)
  const distances = new Map(level.goals.map(goal => [goal.country, reverseDistances(level, goal, floor)]))
  let state = initialState(level)

  // Ignoring other flags gives a lower bound; additional pushes measure more than independent deliveries.
  const minimum = state.boxes.reduce((sum, box) => {
    const minimumPushes = distances.get(box.country).get(box.position) ?? Infinity

    return sum + minimumPushes
  }, 0)

  const runs = []
  const counts = Object.fromEntries(level.boxes.map(box => [box.country, 0]))
  const perFlagTurns = Object.fromEntries(level.boxes.map(box => [box.country, 0]))
  let awayPushes = 0
  let turns = 0
  const lastDirection = new Map()

  for (const direction of directions) {
    const next = move(level, state, direction, floor)
    if (next === state) throw new Error('Design analysis requires a legal solution')

    const index = next.boxes.findIndex((box, i) => box.position !== state.boxes[i].position)
    if (index !== -1) {
      const box = next.boxes[index]
      counts[box.country]++

      // Walking between pushes does not end a run; switching to another flag does.
      if (runs.at(-1) !== box.country) runs.push(box.country)
      if (lastDirection.has(box.country) && lastDirection.get(box.country) !== direction) {
        turns++
        perFlagTurns[box.country]++
      }
      lastDirection.set(box.country, direction)

      const flagDistances = distances.get(box.country)
      const distanceAfter = flagDistances.get(box.position)
      const distanceBefore = flagDistances.get(state.boxes[index].position)

      // Use terrain-aware push distance, not straight-line distance to the destination.
      if (distanceAfter > distanceBefore) awayPushes++
    }

    state = next
  }

  // The first run for each flag is not a revisit; every later run for that flag is.
  const revisits = runs.length - new Set(runs).size

  return {
    pushes: state.pushes,
    minimum,
    extraPushes: state.pushes - minimum,
    awayPushes,
    turns,
    revisits,
    perFlag: counts,
    perFlagTurns,
    dependencies: goalDependencies(level),
    pushRuns: runs
  }
}

/** Choose an intention, not a claim that the resulting board will be fun. */
export function chooseDesign (rng) {
  // One shared intention per date: a Hard parking puzzle must not be paired
  // with a standard routing puzzle, or the reverse.
  const styles = [
    'journey', 'journey', 'journey', 'journey', 'mixed', 'mixed', 'mixed',
    'delivery-order', 'delivery-order', 'parking'
  ]
  const style = styles[Math.floor(rng() * styles.length)]
  const ranges = {
    journey: [[5, 8], [5, 8], [5, 8]],
    mixed: [[2, 3], [4, 6], [7, 9]],
    'delivery-order': [[2, 5], [3, 6], [3, 6]],
    parking: [[2, 5], [3, 6], [3, 6]]
  }

  return { style, ranges: ranges[style], maximumPushes: 32 }
}

export function meetsDesign (metrics, planning, design) {
  // Simple deliveries count. Extra pushes and revisits are ceilings, not goals
  // to maximize, and describe this solution rather than every possible plan.
  if (Object.values(metrics.perFlag).some(count => count < 1)) return false
  const extraLimit = (planning ? 4 : 2) + (design.style === 'parking' ? 2 : 0)
  if (metrics.pushes > design.maximumPushes || metrics.extraPushes > extraLimit) return false
  if (metrics.revisits > (planning ? 2 : 1)) return false

  if (design.style === 'journey') {
    // At least one verified plan completes each flag without returning to it.
    return metrics.dependencies.length === 0 && metrics.revisits === 0 && metrics.extraPushes === 0
  }

  if (design.style === 'parking') {
    return metrics.dependencies.length > 0 && metrics.extraPushes > 0 && metrics.revisits > 0
  }

  if (design.style === 'delivery-order') return metrics.dependencies.length > 0

  return true
}
