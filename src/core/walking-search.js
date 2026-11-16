import { DIRECTIONS, neighbor, walkable } from './engine.js'

/**
 * Cache wall adjacency. Internal searches can borrow two reusable workspaces:
 * one for paths and one for component keys. A borrowed result lasts until the
 * next call in the SAME mode; region-key searches cannot overwrite a path BFS.
 * The default keeps independently owned results for external callers.
 */
export function createWalkingSearch (level, floor = walkable(level), { reuseBuffers = false } = {}) {
  const size = level.width * level.height
  const adjacent = new Int32Array(size * 4).fill(-1)
  for (const position of floor) {
    DIRECTIONS.forEach((direction, index) => {
      const next = neighbor(level, position, direction)
      if (floor.has(next)) adjacent[position * 4 + index] = next
    })
  }
  const allocate = paths => ({
    occupied: new Uint8Array(size),
    visited: new Uint8Array(size),
    parents: paths ? new Int32Array(size) : null,
    distances: paths ? new Uint16Array(size) : null,
    directions: paths ? new Int8Array(size) : null,
    queue: new Int32Array(size)
  })
  const workspaces = reuseBuffers ? [allocate(false), allocate(true)] : null
  return (state, paths = true) => {
    const { occupied, visited, parents, distances, directions, queue } = workspaces?.[Number(paths)] ?? allocate(paths)
    if (reuseBuffers) { occupied.fill(0); visited.fill(0) }
    for (const box of state.boxes) occupied[box.position] = 1
    let end = 1
    let minimum = state.player
    queue[0] = state.player
    visited[state.player] = 1
    if (paths) { distances[state.player] = 0; parents[state.player] = -1 }
    for (let index = 0; index < end; index++) {
      const position = queue[index]
      for (let direction = 0; direction < 4; direction++) {
        const next = adjacent[position * 4 + direction]
        if (next < 0 || visited[next] || occupied[next]) continue
        visited[next] = 1
        queue[end++] = next
        if (next < minimum) minimum = next
        if (paths) { parents[next] = position; directions[next] = direction; distances[next] = distances[position] + 1 }
      }
    }
    return {
      minimum,
      has: position => position >= 0 && visited[position] === 1,
      distanceTo: position => paths && position >= 0 && visited[position] ? distances[position] : null,
      pathTo (position) {
        if (!paths || position < 0 || !visited[position]) return null
        const path = []
        while (position !== state.player) {
          path.push(DIRECTIONS[directions[position]])
          position = parents[position]
        }
        return path.reverse()
      }
    }
  }
}
