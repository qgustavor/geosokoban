import { createWalkingSearch } from './walking-search.js'
import { DIRECTIONS, OPPOSITE, neighbor, walkable, move, isSolved } from './engine.js'

/** Relaxed push distances ignore other boxes but retain walls and player support squares. */
export function reverseDistances (level, goal, floor = walkable(level)) {
  const distances = new Map([[goal.position, 0]])
  const queue = [goal.position]

  for (let index = 0; index < queue.length; index++) {
    const position = queue[index]

    for (const direction of DIRECTIONS) {
      // Work backward from a destination. A forward push from `previous` into
      // `position` would require the player one more tile behind the flag.
      const previous = neighbor(level, position, direction)
      const support = neighbor(level, previous, direction)

      if (floor.has(previous) && floor.has(support) && !distances.has(previous)) {
        distances.set(previous, distances.get(position) + 1)
        queue.push(previous)
      }
    }
  }

  return distances
}

export function isDefinitelyStuck (level, state) {
  const floor = walkable(level)

  // Failure even without the other flags proves a deadlock. Passing this check
  // does not prove solvability: flags may still block one another.
  return state.boxes.some(box => {
    const goal = level.goals.find(goal => goal.country === box.country)
    return !goal || !reverseDistances(level, goal, floor).has(box.position)
  })
}

const compareNodes = (a, b) => {
  const priorityDifference = a.priority - b.priority

  // Prefer the deeper node on equal estimated total cost. Keeping this tie-break
  // stable preserves the chosen solution and the number of expanded states.
  return priorityDifference || b.node.cost - a.node.cost
}

class MinHeap {
  items = []

  push (item) {
    this.items.push(item)
    let index = this.items.length - 1

    while (index > 0) {
      const parent = Math.floor((index - 1) / 2)
      if (compareNodes(this.items[parent], item) <= 0) break

      this.items[index] = this.items[parent]
      index = parent
    }

    this.items[index] = item
  }

  pop () {
    const first = this.items[0]
    const last = this.items.pop()
    if (!this.items.length) return first

    let index = 0

    while (index * 2 + 1 < this.items.length) {
      let child = index * 2 + 1
      const rightChild = child + 1
      const rightComesFirst = rightChild < this.items.length &&
        compareNodes(this.items[rightChild], this.items[child]) < 0

      if (rightComesFirst) child++
      if (compareNodes(this.items[child], last) >= 0) break

      this.items[index] = this.items[child]
      index = child
    }

    this.items[index] = last
    return first
  }
}

/** A* uses push macros; move-optimal search keeps the exact player position. */
export function solve (level, start, maxStates = 12000, { objective = 'pushes' } = {}) {
  if (!['pushes', 'moves'].includes(objective)) throw new RangeError('Unknown search objective')
  if (!Number.isSafeInteger(maxStates) || maxStates < 0) throw new RangeError('Invalid search budget')

  const byMoves = objective === 'moves'
  if (isSolved(level, start)) return { status: 'solved', moves: [], expanded: 0, cost: 0, objective, optimal: true }

  const floor = walkable(level)
  const legal = new Map(level.goals.map(goal => [goal.country, reverseDistances(level, goal, floor)]))
  const estimate = state => {
    // Independent-flag distances underestimate work when flags interfere;
    // an unreachable destination remains Infinity so that state can be pruned.
    const pushes = state.boxes.reduce((sum, box) => {
      const minimumPushes = legal.get(box.country)?.get(box.position) ?? Infinity
      return sum + minimumPushes
    }, 0)

    if (!byMoves || pushes === 0) return pushes

    // Before the first push, the player must reach a flag's side. Manhattan
    // distance ignores walls, and subtracting one stops at the adjacent tile.
    const playerX = state.player % level.width
    const playerY = Math.floor(state.player / level.width)
    const flagDistances = state.boxes.map(box => {
      const boxX = box.position % level.width
      const boxY = Math.floor(box.position / level.width)
      return Math.abs(playerX - boxX) + Math.abs(playerY - boxY)
    })
    const walk = Math.max(0, Math.min(...flagDistances) - 1)

    return pushes + walk
  }

  if (!Number.isFinite(estimate(start))) return { status: 'unsolvable', expanded: 0, objective }

  const search = createWalkingSearch(level, floor, { reuseBuffers: true })
  const key = state => {
    const boxPositions = state.boxes.map(box => box.position).join(',')

    // For push cost, all player positions in one reachable component have the
    // same available pushes. Move cost must retain the exact walking origin.
    const playerPosition = byMoves ? state.player : search(state, false).minimum
    return boxPositions + '@' + playerPosition
  }
  const first = { state: start, parent: null, cost: 0, signature: key(start) }
  const best = new Map([[first.signature, 0]])
  const heap = new MinHeap()
  heap.push({ priority: estimate(start), node: first })

  let expanded = 0

  while (heap.items.length) {
    const { node } = heap.pop()

    // A cheaper route may have superseded this heap entry after it was queued.
    if (best.get(node.signature) !== node.cost) continue

    if (isSolved(level, node.state)) {
      const segments = []

      // Nodes store pushes, not every walk. Recover each shortest approach only
      // for the winning chain, then put the parent-to-child segments in order.
      for (let cursor = node; cursor.parent; cursor = cursor.parent) {
        const path = search(cursor.parent.state).pathTo(cursor.stand)
        segments.push([...path, cursor.direction])
      }

      const moves = segments.reverse().flat()
      return { status: 'solved', moves, expanded, cost: node.cost, objective, optimal: true }
    }

    // Exhausting a work budget is not proof that the puzzle is unsolvable.
    if (expanded >= maxStates) {
      const lowerBound = node.cost + estimate(node.state)
      return { status: 'budget-exceeded', expanded, objective, lowerBound }
    }

    expanded++
    const reach = search(node.state)

    for (const box of node.state.boxes) {
      for (const direction of DIRECTIONS) {
        const stand = neighbor(level, box.position, OPPOSITE[direction])
        const pathLength = reach.distanceTo(stand)
        if (pathLength === null) continue

        // One search edge consists of the approach walk followed by one push.
        const intermediate = { ...node.state, player: stand, moves: node.state.moves + pathLength }
        const next = move(level, intermediate, direction, floor)
        if (next === intermediate) continue

        const estimateNext = estimate(next)
        if (!Number.isFinite(estimateNext)) continue

        const signature = key(next)
        const stepCost = byMoves ? pathLength + 1 : 1
        const cost = node.cost + stepCost
        if ((best.get(signature) ?? Infinity) <= cost) continue

        best.set(signature, cost)
        const nextNode = { state: next, signature, cost, parent: node, stand, direction }
        heap.push({ priority: cost + estimateNext, node: nextNode })
      }
    }
  }

  return { status: 'unsolvable', expanded, objective }
}
