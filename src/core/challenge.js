import { DIRECTIONS, neighbor, walkable } from './engine.js'
import { reverseDistances } from './solver.js'

export const CHALLENGES = ['easy', 'medium', 'hard']

export function challengeSettings (value) {
  return { guidance: ['medium', 'hard'].includes(value) ? 'remember' : 'learn', planning: value === 'hard' }
}

export function challengeName (guidance, planning) {
  return planning ? 'hard' : guidance === 'remember' ? 'medium' : 'easy'
}

export function withPlanning (code, planning) {
  return code.replace(/-P$/, '') + (planning ? '-P' : '')
}

const coordinate = (level, position, axis) => axis === 'x' ? position % level.width : Math.floor(position / level.width)

/** A cut across the island creates one commitment gate or two alternating routes. */
export function addChallengePattern (base, rng, motif) {
  const floor = new Set(base.floors)
  const axis = rng() < 0.5 ? 'x' : 'y'
  const span = axis === 'x' ? base.width : base.height
  const normal = axis === 'x' ? ['left', 'right'] : ['up', 'down']
  const candidates = []
  for (let cut = 3; cut < span - 3; cut++) {
    if (!base.goals.some(goal => coordinate(base, goal.position, axis) < cut - 1) || !base.goals.some(goal => coordinate(base, goal.position, axis) > cut + 1)) continue
    const line = base.floors.filter(position => coordinate(base, position, axis) === cut)
    if (line.length < 4 || base.goals.some(goal => Math.abs(coordinate(base, goal.position, axis) - cut) <= 1)) continue
    const openings = line.filter(position => DIRECTIONS.every(direction => floor.has(neighbor(base, position, direction))) && normal.every(direction => floor.has(neighbor(base, neighbor(base, position, direction), direction))))
    for (const first of openings) {
      const others = motif === 'sliding-door' ? openings.filter(position => Math.abs(coordinate(base, first, axis === 'x' ? 'y' : 'x') - coordinate(base, position, axis === 'x' ? 'y' : 'x')) >= 3) : [null]
      for (const second of others) {
        if (second !== null && second < first) continue
        const gates = second === null ? [first] : [first, second]
        const obstacles = line.filter(position => !gates.includes(position))
        const next = { ...base, obstacles, motif, planning: true, gates, cut: { axis, position: cut } }
        candidates.push(next)
      }
    }
  }
  while (candidates.length) {
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
    if (area.size >= open.size * 0.85 && base.goals.every(goal => area.has(goal.position))) return next
  }
  return null
}

/** At least one flag starts across the barrier from its own destination. */
export function crossesChallengeGate (level, state) {
  if (!level.gates?.length || !level.cut) return false
  return state.boxes.some(box => {
    const goal = level.goals.find(goal => goal.country === box.country)
    return (coordinate(level, box.position, level.cut.axis) - level.cut.position) *
      (coordinate(level, goal.position, level.cut.axis) - level.cut.position) < 0
  })
}

export function challengeDistances (level) {
  const floor = walkable(level)
  return new Map(level.goals.map(goal => [goal.country, reverseDistances(level, goal, floor)]))
}

export function pushLowerBound (distances, state) {
  return state.boxes.reduce((sum, box) => sum + (distances.get(box.country)?.get(box.position) ?? Infinity), 0)
}

/** A destination in a narrow passage creates a real delivery-order decision. */
export function addGoalGatePattern (base, rng, planning) {
  const floor = new Set(base.floors)
  const candidates = []
  for (const goal of base.goals) {
    for (const axis of ['x', 'y']) {
      const normal = axis === 'x' ? ['left', 'right'] : ['up', 'down']
      const cut = coordinate(base, goal.position, axis)
      if (!normal.every(direction => floor.has(neighbor(base, goal.position, direction)) && floor.has(neighbor(base, neighbor(base, goal.position, direction), direction)))) continue
      if (base.goals.some(other => other !== goal && Math.abs(coordinate(base, other.position, axis) - cut) <= 1)) continue
      const line = base.floors.filter(position => coordinate(base, position, axis) === cut)
      if (line.length < 4) continue
      const obstacles = line.filter(position => position !== goal.position)
      const level = { ...base, obstacles, gates: [goal.position], cut: { axis, position: cut }, motif: planning ? 'parking-gate' : 'delivery-order', planning }
      const open = walkable(level)
      const area = new Set([goal.position])
      const queue = [...area]
      for (let i = 0; i < queue.length; i++) {
        for (const direction of DIRECTIONS) {
          const next = neighbor(base, queue[i], direction)
          if (open.has(next) && !area.has(next)) { area.add(next); queue.push(next) }
        }
      }
      if (area.size >= open.size * .85 && base.goals.every(other => area.has(other.position))) candidates.push(level)
    }
  }
  if (!candidates.length) return null
  return candidates[Math.floor(rng() * candidates.length)]
}
