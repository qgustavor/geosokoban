import { initialState, move, walkable } from './engine.js'
import { reverseDistances } from './solver.js'

/** A filled destination can close a route needed by a different flag. */
export function goalDependencies (level, state = initialState(level)) {
  const floor = walkable(level)
  const dependencies = []
  for (const gate of level.goals) {
    const closed = new Set(floor)
    closed.delete(gate.position)
    for (const box of state.boxes) {
      if (box.country === gate.country) continue
      const goal = level.goals.find(goal => goal.country === box.country)
      if (!reverseDistances(level, goal, closed).has(box.position)) dependencies.push({ before: box.country, after: gate.country })
    }
  }
  return dependencies
}

/** Metrics describe a verified push-optimal solution, not a human difficulty rating. */
export function analyzeDesign (level, directions) {
  const floor = walkable(level)
  const distances = new Map(level.goals.map(goal => [goal.country, reverseDistances(level, goal, floor)]))
  let state = initialState(level)
  const minimum = state.boxes.reduce((sum, box) => sum + (distances.get(box.country).get(box.position) ?? Infinity), 0)
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
      if (runs.at(-1) !== box.country) runs.push(box.country)
      if (lastDirection.has(box.country) && lastDirection.get(box.country) !== direction) turns++
      lastDirection.set(box.country, direction)
      if (distances.get(box.country).get(box.position) > distances.get(box.country).get(state.boxes[index].position)) awayPushes++
    }
    state = next
  }
  return {
    pushes: state.pushes,
    minimum,
    extraPushes: state.pushes - minimum,
    awayPushes,
    turns,
    revisits: runs.length - new Set(runs).size,
    perFlag: counts,
    dependencies: goalDependencies(level),
    pushRuns: runs
  }
}

export function meetsDesign (metrics, planning) {
  if (Object.values(metrics.perFlag).some(count => count < 2) || metrics.dependencies.length < 1) return false
  if (!planning) return metrics.pushes >= 10 && metrics.pushes <= 28 && metrics.turns >= 2
  return metrics.pushes >= 22 && metrics.pushes <= 65 && metrics.extraPushes >= 4 && metrics.awayPushes >= 2 && metrics.revisits >= 1
}
