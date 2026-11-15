export const DIRECTIONS = ['up', 'right', 'down', 'left']
export const OPPOSITE = { up: 'down', right: 'left', down: 'up', left: 'right' }
const DELTAS = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] }

/** Return a neighbor without allowing a move to wrap into another row. */
export function neighbor (level, position, direction) {
  const delta = DELTAS[direction]
  if (!delta) return -1
  const x = position % level.width + delta[0]
  const y = Math.floor(position / level.width) + delta[1]
  return x < 0 || x >= level.width || y < 0 || y >= level.height ? -1 : y * level.width + x
}

export function initialState (level) {
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
  let boxes = state.boxes
  if (boxIndex !== -1) {
    const beyond = neighbor(level, next, direction)
    if (!floor.has(beyond) || boxes.some(box => box.position === beyond)) return state
    boxes = boxes.map((box, index) => index === boxIndex ? { ...box, position: beyond } : box)
  }
  return {
    player: next,
    boxes,
    moves: state.moves + 1,
    pushes: state.pushes + Number(boxIndex !== -1)
  }
}

export function isSolved (level, state) {
  return level.goals.length > 0 && level.goals.every(goal =>
    state.boxes.some(box => box.position === goal.position && box.country === goal.country)
  )
}

/** Flood fill also records shortest walking paths around the current boxes. */
export function reachable (level, state, floor = walkable(level)) {
  const occupied = new Set(state.boxes.map(box => box.position))
  const paths = new Map([[state.player, []]])
  const queue = [state.player]
  for (let index = 0; index < queue.length; index++) {
    const position = queue[index]
    for (const direction of DIRECTIONS) {
      const next = neighbor(level, position, direction)
      if (!floor.has(next) || occupied.has(next) || paths.has(next)) continue
      paths.set(next, [...paths.get(position), direction])
      queue.push(next)
    }
  }
  return paths
}

export function validateLevel (level) {
  const errors = []
  const size = level.width * level.height
  const validPosition = position => Number.isInteger(position) && position >= 0 && position < size
  if (!Number.isInteger(level.width) || !Number.isInteger(level.height) || size < 1) errors.push('Invalid dimensions')
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
  if (actors.some(position => level.goals.some(goal => goal.position === position))) errors.push('Covered starting goal')
  const countries = level.goals.map(goal => goal.country).sort()
  if (!countries.length || new Set(countries).size !== countries.length) errors.push('Invalid goal identities')
  if (JSON.stringify(countries) !== JSON.stringify(level.boxes.map(box => box.country).sort())) errors.push('Mismatched boxes and goals')
  if (new Set(level.boxes.map(box => box.id)).size !== level.boxes.length) errors.push('Duplicate box IDs')
  return errors
}

export function replay (level, directions, state = initialState(level)) {
  const floor = walkable(level)
  for (const direction of directions) {
    const next = move(level, state, direction, floor)
    if (next === state) return { valid: false, state }
    state = next
  }
  return { valid: true, state }
}
