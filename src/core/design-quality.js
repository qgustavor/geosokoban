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

/** Metrics describe a verified push-optimal solution, not a human difficulty rating. */
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
      if (lastDirection.has(box.country) && lastDirection.get(box.country) !== direction) turns++
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
    dependencies: goalDependencies(level),
    pushRuns: runs
  }
}

export function meetsDesign (metrics, planning) {
  // Every flag must matter, and at least one delivery must constrain another flag's route.
  const hasUnderusedFlag = Object.values(metrics.perFlag).some(count => count < 2)
  if (hasUnderusedFlag || metrics.dependencies.length < 1) return false

  if (!planning) {
    const withinPushRange = metrics.pushes >= 10 && metrics.pushes <= 28

    return withinPushRange && metrics.turns >= 2
  }

  // Hard requires interaction and repositioning in this solution, not just a longer walk.
  const withinPushRange = metrics.pushes >= 22 && metrics.pushes <= 65

  return withinPushRange &&
    metrics.extraPushes >= 4 &&
    metrics.awayPushes >= 2 &&
    metrics.revisits >= 1
}
