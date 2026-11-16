export const DIRECTIONS = ['up', 'right', 'down', 'left']
export const OPPOSITE = { up: 'down', right: 'left', down: 'up', left: 'right' }
const DELTAS = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] }

/** Return a neighbor without allowing a move to wrap into another row. */
export function neighbor (level, position, direction) {
  const delta = DELTAS[direction]
  if (!delta) return -1

  // A flat index alone cannot distinguish crossing a row edge from moving right.
  // Check the destination in grid coordinates before converting back to an index.
  const x = position % level.width + delta[0]
  const y = Math.floor(position / level.width) + delta[1]
  const outsideBoard = x < 0 || x >= level.width || y < 0 || y >= level.height

  return outsideBoard ? -1 : y * level.width + x
}

export function initialState (level) {
  // State owns its flags so a play session cannot mutate the reusable level definition.
  return { player: level.player, boxes: level.boxes.map(box => ({ ...box })), moves: 0, pushes: 0 }
}

export function walkable (level) {
  const blocked = new Set(level.obstacles)
  return new Set(level.floors.filter(position => !blocked.has(position)))
}

/** Invalid moves return the same object and do not affect move counts. */
export function move (level, state, direction, floor = walkable(level)) {
  const next = neighbor(level, state.player, direction)
  if (!floor.has(next)) return state

  const boxIndex = state.boxes.findIndex(box => box.position === next)
  const isPush = boxIndex !== -1
  let boxes = state.boxes

  if (isPush) {
    const beyond = neighbor(level, next, direction)

    // Only one flag can move per push. Destinations remain ordinary walkable
    // cells, so a delivered flag can still be moved out of another flag's way.
    if (!floor.has(beyond) || boxes.some(box => box.position === beyond)) return state

    boxes = boxes.map((box, index) => index === boxIndex ? { ...box, position: beyond } : box)
  }

  // Walking shares the unchanged box array; pushing replaces only the moved box.
  // Callers use state identity to distinguish a blocked input from a successful move.
  return {
    player: next,
    boxes,
    moves: state.moves + 1,
    pushes: state.pushes + Number(isPush)
  }
}

export function isSolved (level, state) {
  // Occupying a destination is not enough: each flag must match its country.
  return level.goals.length > 0 && level.goals.every(goal =>
    state.boxes.some(box => box.position === goal.position && box.country === goal.country)
  )
}

/** Flood fill also records shortest walking paths around the current boxes. */
export function reachable (level, state, floor = walkable(level)) {
  const occupied = new Set(state.boxes.map(box => box.position))
  const paths = new Map([[state.player, []]])
  const queue = [state.player]

  // FIFO traversal visits each tile by a shortest route. Direction order breaks
  // ties consistently, which matters when a solver later reconstructs its moves.
  for (let index = 0; index < queue.length; index++) {
    const position = queue[index]

    for (const direction of DIRECTIONS) {
      const next = neighbor(level, position, direction)
      if (!floor.has(next) || occupied.has(next) || paths.has(next)) continue

      const path = [...paths.get(position), direction]
      paths.set(next, path)
      queue.push(next)
    }
  }

  return paths
}

export function validateLevel (level) {
  const errors = []
  const size = level.width * level.height
  const validPosition = position => Number.isInteger(position) && position >= 0 && position < size
  const invalidDimensions = !Number.isInteger(level.width) || !Number.isInteger(level.height) || size < 1

  if (invalidDimensions) errors.push('Invalid dimensions')
  if (level.floors.some(position => !validPosition(position))) errors.push('Floor outside board')
  if (new Set(level.floors).size !== level.floors.length) errors.push('Duplicate floor')
  if (new Set(level.obstacles).size !== level.obstacles.length) errors.push('Duplicate obstacle')
  if (level.obstacles.some(position => !level.floors.includes(position))) errors.push('Obstacle outside land')

  const floor = walkable(level)
  const actors = [level.player, ...level.boxes.map(box => box.position)]

  if (actors.some(position => !floor.has(position))) errors.push('Actor on blocked tile')
  if (new Set(actors).size !== actors.length) errors.push('Overlapping actors')
  if (level.goals.some(goal => !floor.has(goal.position))) errors.push('Goal on blocked tile')
  if (new Set(level.goals.map(goal => goal.position)).size !== level.goals.length) errors.push('Overlapping goals')

  // Starting destinations must be visible, even though covering them during play is legal.
  const coveredStartingGoal = actors.some(position => level.goals.some(goal => goal.position === position))
  if (coveredStartingGoal) errors.push('Covered starting goal')

  const countries = level.goals.map(goal => goal.country).sort()
  if (!countries.length || new Set(countries).size !== countries.length) errors.push('Invalid goal identities')

  // Sorting checks the country multiset without requiring boxes and goals to share an array order.
  const goalCountries = JSON.stringify(countries)
  const boxCountries = JSON.stringify(level.boxes.map(box => box.country).sort())
  if (goalCountries !== boxCountries) errors.push('Mismatched boxes and goals')
  if (new Set(level.boxes.map(box => box.id)).size !== level.boxes.length) errors.push('Duplicate box IDs')

  return errors
}

export function replay (level, directions, state = initialState(level)) {
  const floor = walkable(level)

  for (const direction of directions) {
    const next = move(level, state, direction, floor)

    // Stop at the last legal state rather than silently skipping a broken certificate step.
    if (next === state) return { valid: false, state }
    state = next
  }

  return { valid: true, state }
}
