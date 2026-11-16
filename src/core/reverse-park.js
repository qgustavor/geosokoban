import { DIRECTIONS, OPPOSITE, neighbor, walkable } from './engine.js'
import { createWalkingSearch } from './walking-search.js'

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
    const atGateApproach = destinations.some(target =>
      target.box === box.position && target.player === node.state.player
    )

    if (atGateApproach && !goals.has(node.state.player)) {
      const chunks = []

      // These segments undo reverse pulls. Following parents already produces
      // the forward order, so unlike an ordinary BFS path they are not reversed.
      for (let current = node; current.parent; current = current.parent) chunks.push(current.segment)

      return { ...node.state, solution: [...chunks.flat(), ...solution] }
    }

    const paths = search(node.state)

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
