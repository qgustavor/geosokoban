import { DIRECTIONS, OPPOSITE, neighbor, walkable } from './engine.js'
import { reverseDistances } from './solver.js'
import { createWalkingSearch } from './walking-search.js'
import { pullDistances } from './placement.js'

/** Reverse-pull the gate flag to its approach, leaving a forward parking decision. */
export function stageGateFlag (level, start, solution) {
  const gate = level.goals.find(goal => level.gates.includes(goal.position))
  const index = start.boxes.findIndex(box => box.country === gate.country)
  const floor = walkable(level)
  const search = createWalkingSearch(level, floor, { reuseBuffers: true })
  const crossingDirections = level.cut.axis === 'x' ? ['left', 'right'] : ['up', 'down']

  // The flag waits beside its gate, with the player one tile farther out so
  // the forward solution can push toward the destination rather than away.
  const destinations = crossingDirections.map(direction => {
    const box = neighbor(level, gate.position, direction)
    const player = neighbor(level, box, direction)
    return { box, player }
  }).filter(target => floor.has(target.box) && floor.has(target.player))

  const others = new Set(start.boxes.filter((box, i) => i !== index).map(box => box.position))
  const goals = new Set(level.goals.map(goal => goal.position))
  const queue = [{ state: start, parent: null, segment: null }]
  const seen = new Set()

  // Count expanded reverse states instead of elapsed time so a shared seed
  // does not produce a different board on a faster device.
  for (let cursor = 0; cursor < queue.length && cursor < 450; cursor++) {
    const node = queue[cursor]
    const box = node.state.boxes[index]
    const paths = search(node.state)
    const approach = destinations.find(target =>
      target.box === box.position && paths.has(target.player) && !goals.has(target.player)
    )

    if (approach) {
      // The last pull can arrive sideways. Walk to the pushing side before
      // finishing reverse staging instead of demanding a particular last pull.
      const returnWalk = paths.pathTo(approach.player).toReversed().map(direction => OPPOSITE[direction])
      const chunks = [returnWalk]

      // These segments undo reverse pulls. Following parents already produces
      // the forward order, so unlike an ordinary BFS path they are not reversed.
      for (let current = node; current.parent; current = current.parent) chunks.push(current.segment)

      return { ...node.state, player: approach.player, solution: [...chunks.flat(), ...solution] }
    }

    for (const direction of DIRECTIONS) {
      const stand = neighbor(level, box.position, direction)
      const back = neighbor(level, stand, direction)
      if (!paths.has(stand) || !floor.has(back) || others.has(back)) continue

      // Pull the gate flag into the player's old tile as the player steps back.
      // All other flags remain fixed throughout this staging search.
      const boxes = node.state.boxes.map((box, i) => i === index ? { ...box, position: stand } : box)
      const state = { ...node.state, player: back, boxes }
      const key = `${stand}@${search(state, false).minimum}`
      if (seen.has(key)) continue

      seen.add(key)

      // Undo the pull with one push, then retrace the approach walk. The
      // component-key search above uses a different buffer from these paths.
      const returnWalk = paths.pathTo(stand).toReversed().map(direction => OPPOSITE[direction])
      const segment = [OPPOSITE[direction], ...returnWalk]
      queue.push({ state, parent: node, segment })
    }
  }

  return null
}

/** Give one flag a reverse-play destination across the delivery gate. */
export function planGateCrossing (level, distances, rng) {
  const floor = walkable(level)
  const closed = new Set(floor)
  closed.delete(level.gates[0])
  const goals = new Set(level.goals.map(goal => goal.position))
  const options = []

  level.goals.forEach((goal, index) => {
    if (level.gates.includes(goal.position)) return
    const withoutGate = reverseDistances(level, goal, closed)
    const candidates = [...distances.get(goal.country)].filter(([position, pushes]) => {
      return !goals.has(position) && !withoutGate.has(position) && pushes <= 16
    }).sort((a, b) => a[1] - b[1])
    if (!candidates.length) return
    const [position, pushes] = candidates[Math.floor(rng() * Math.min(4, candidates.length))]
    options.push({ index, position, pushes })
  })

  if (!options.length) return null
  const choice = options[Math.floor(rng() * options.length)]
  const toward = pullDistances(level, choice.position, floor)

  return { ...choice, toward }
}
