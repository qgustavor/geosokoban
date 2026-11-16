import { DIRECTIONS, OPPOSITE, neighbor, walkable } from './engine.js'
import { createWalkingSearch } from './walking-search.js'

/** Reverse-pull the gate flag to its approach, leaving a forward parking decision. */
export function stageGateFlag (level, start, solution) {
  const gate = level.goals.find(goal => level.gates.includes(goal.position))
  const index = start.boxes.findIndex(box => box.country === gate.country)
  const floor = walkable(level)
  const search = createWalkingSearch(level, floor, { reuseBuffers: true })
  const normal = level.cut.axis === 'x' ? ['left', 'right'] : ['up', 'down']
  const destinations = normal.map(direction => ({ box: neighbor(level, gate.position, direction), player: neighbor(level, neighbor(level, gate.position, direction), direction) }))
    .filter(target => floor.has(target.box) && floor.has(target.player))
  const others = new Set(start.boxes.filter((box, i) => i !== index).map(box => box.position))
  const goals = new Set(level.goals.map(goal => goal.position))
  const queue = [{ state: start, parent: null, segment: null }]
  const seen = new Set()
  for (let cursor = 0; cursor < queue.length && cursor < 450; cursor++) {
    const node = queue[cursor]
    const box = node.state.boxes[index]
    if (destinations.some(target => target.box === box.position && target.player === node.state.player) && !goals.has(node.state.player)) {
      const chunks = []
      for (let current = node; current.parent; current = current.parent) chunks.push(current.segment)
      return { ...node.state, solution: [...chunks.flat(), ...solution] }
    }
    const paths = search(node.state)
    for (const direction of DIRECTIONS) {
      const stand = neighbor(level, box.position, direction)
      const back = neighbor(level, stand, direction)
      if (!paths.has(stand) || !floor.has(back) || others.has(back)) continue
      const state = { ...node.state, player: back, boxes: node.state.boxes.map((box, i) => i === index ? { ...box, position: stand } : box) }
      const key = `${stand}@${search(state, false).minimum}`
      if (seen.has(key)) continue
      seen.add(key)
      queue.push({ state, parent: node, segment: [OPPOSITE[direction], ...paths.pathTo(stand).toReversed().map(direction => OPPOSITE[direction])] })
    }
  }
  return null
}
