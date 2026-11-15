import { DIRECTIONS, neighbor, walkable } from './engine.js'

/** Cache wall adjacency; reconstruct paths only for pushes actually considered. */
export function createWalkingSearch (level, floor = walkable(level)) {
  const size = level.width * level.height
  const adjacent = new Int32Array(size * 4).fill(-1)
  for (const position of floor) {
    DIRECTIONS.forEach((direction, index) => {
      const next = neighbor(level, position, direction)
      if (floor.has(next)) adjacent[position * 4 + index] = next
    })
  }
  return (state, paths = true) => {
    const occupied = new Uint8Array(size)
    for (const box of state.boxes) occupied[box.position] = 1
    const visited = new Uint8Array(size)
    const parents = paths ? new Int32Array(size).fill(-1) : null
    const distances = paths ? new Uint16Array(size) : null
    const directions = paths ? new Int8Array(size) : null
    const queue = new Int32Array(size)
    let end = 1
    let minimum = state.player
    queue[0] = state.player
    visited[state.player] = 1
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
        if (!paths || !visited[position]) return null
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
