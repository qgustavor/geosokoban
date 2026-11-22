import { initialState, replay, isSolved, walkable } from './engine.js'
import { solve } from './solver.js'

/** Find a plan that delivers each flag once, without moving the others aside. */
export function solveDeliveries (level, maxStates, start = initialState(level)) {
  let expanded = 0

  function visit (state, remaining) {
    if (!remaining.length) return isSolved(level, state) ? [] : null

    for (const country of remaining) {
      if (expanded >= maxStates) return null

      const box = state.boxes.find(box => box.country === country)
      const others = state.boxes.filter(box => box.country !== country)
      const single = {
        ...level,
        obstacles: [...level.obstacles, ...others.map(box => box.position)],
        goals: level.goals.filter(goal => goal.country === country)
      }

      // Other flags are fixed obstacles for this delivery. Try all six orders
      // for three flags; failure of a single order is not a deadlock verdict.
      const result = solve(single, { ...state, boxes: [box] }, Math.min(1000, maxStates - expanded))
      expanded += result.expanded
      if (result.status !== 'solved') continue

      const next = replay(level, result.moves, state)
      if (!next.valid) throw new Error('Invalid delivery plan')
      const rest = visit(next.state, remaining.filter(value => value !== country))
      if (rest) return [...result.moves, ...rest]
    }

    return null
  }

  const moves = visit(start, level.boxes.map(box => box.country))
  return { status: moves ? 'solved' : 'unconfirmed', moves, expanded }
}

/** One short parking trip, followed by complete deliveries rather than repeated shuffling. */
export function solveWithParking (level, maxStates, maxParkingPushes) {
  const start = initialState(level)
  const goal = level.goals.find(goal => level.gates.includes(goal.position))
  const box = start.boxes.find(box => box.country === goal.country)
  const others = start.boxes.filter(other => other !== box)
  const goals = new Set(level.goals.map(goal => goal.position))
  const occupied = new Set(others.map(other => other.position))
  const x = box.position % level.width
  const y = Math.floor(box.position / level.width)
  const candidates = [...walkable(level)].filter(position => {
    const distance = Math.abs(position % level.width - x) + Math.abs(Math.floor(position / level.width) - y)
    return distance > 0 && distance <= maxParkingPushes && !goals.has(position) && !occupied.has(position)
  })
  let expanded = 0

  for (const position of candidates) {
    if (expanded >= maxStates) break
    const single = {
      ...level,
      obstacles: [...level.obstacles, ...others.map(other => other.position)],
      goals: [{ country: box.country, position }]
    }
    const park = solve(single, { ...start, boxes: [box] }, Math.min(150, maxStates - expanded))
    expanded += park.expanded
    if (park.status !== 'solved' || park.cost > maxParkingPushes) continue

    const parked = replay(level, park.moves)
    if (!parked.valid) throw new Error('Invalid parking plan')
    const deliveries = solveDeliveries(level, Math.min(4000, maxStates - expanded), parked.state)
    expanded += deliveries.expanded
    if (deliveries.status !== 'solved') continue

    return { status: 'solved', moves: [...park.moves, ...deliveries.moves], expanded }
  }

  return { status: 'unconfirmed', moves: null, expanded }
}
