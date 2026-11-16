/** The underlay uses a fixed 4 × 4 pixel lattice per 40-unit gameplay cell. */
export const MAP_PIXELS_PER_CELL = 4
export const MAP_TILE_SIZE = 40
export const MAP_PIXEL_SIZE = MAP_TILE_SIZE / MAP_PIXELS_PER_CELL

/** Read the absolute, polygon-only paths emitted by the geography projection. */
function pathRings (path) {
  if (!path) return []

  const tokens = path.match(/[MLZ]|-?(?:\d*\.)?\d+(?:e[+-]?\d+)?/gi) ?? []
  const rings = []
  let ring = null

  for (let index = 0; index < tokens.length;) {
    const command = tokens[index++].toUpperCase()

    // Rings are closed by the scanline traversal's last-to-first edge, not by repeating the first point here.
    if (command === 'Z') continue
    if (command !== 'M' && command !== 'L') throw new Error('Expected a projected polygon path')

    // Work in logical map pixels while keeping the same origin as the gameplay/SVG coordinate system.
    const x = Number(tokens[index++]) / MAP_PIXEL_SIZE
    const y = Number(tokens[index++]) / MAP_PIXEL_SIZE

    if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('Invalid projected coordinate')

    if (command === 'M') {
      ring = []
      rings.push(ring)
    }

    if (!ring) throw new Error('A polygon must start with M')

    ring.push([x, y])
  }

  return rings.filter(ring => ring.length >= 3)
}

/**
 * Rasterize at pixel centers, then trace the exposed edges back into an SVG.
 * This runs when preparing assets, never while rendering or generating a game.
 * Bounds are in SVG units and clip distant context, not playable geography.
 */
export function mosaicPath (path, bounds = [-Infinity, -Infinity, Infinity, Infinity]) {
  const rings = pathRings(path)
  if (!rings.length) return ''

  let left = Infinity
  let top = Infinity
  let right = -Infinity
  let bottom = -Infinity

  for (const ring of rings) {
    for (const [x, y] of ring) {
      left = Math.min(left, x)
      top = Math.min(top, y)
      right = Math.max(right, x)
      bottom = Math.max(bottom, y)
    }
  }

  // Enclose the geometry on the global pixel lattice, then clip to whole pixels inside the supplied bounds.
  // Rounding in this order keeps negative coordinates aligned with the board's origin too.
  left = Math.max(Math.floor(left), Math.ceil(bounds[0] / MAP_PIXEL_SIZE))
  top = Math.max(Math.floor(top), Math.ceil(bounds[1] / MAP_PIXEL_SIZE))
  right = Math.min(Math.ceil(right), Math.floor(bounds[2] / MAP_PIXEL_SIZE))
  bottom = Math.min(Math.ceil(bottom), Math.floor(bounds[3] / MAP_PIXEL_SIZE))

  const width = right - left
  const height = bottom - top
  if (width <= 0 || height <= 0) return ''

  // Bound developer-tool allocations even for malformed projections.
  const pixelCount = width * height
  if (!Number.isSafeInteger(pixelCount) || pixelCount > 4000000) throw new Error('Mosaic bounds are too large')

  const pixels = new Uint8Array(pixelCount)

  for (let row = 0; row < height; row++) {
    const y = top + row + 0.5
    const intersections = []

    for (const ring of rings) {
      for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
        const [x1, y1] = ring[previous]
        const [x2, y2] = ring[index]
        const crossesRow = (y1 > y) !== (y2 > y)

        // The half-open crossing rule avoids counting shared vertices twice and skips horizontal edges.
        if (!crossesRow) continue

        const crossingX = x1 + (y - y1) * (x2 - x1) / (y2 - y1)
        intersections.push(crossingX)
      }
    }

    // Pair crossings across all rings: even-odd filling preserves both separate islands and holes.
    intersections.sort((a, b) => a - b)

    for (let index = 0; index + 1 < intersections.length; index += 2) {
      // Subtract the half-pixel center offset; include the left crossing and exclude the right crossing.
      const start = Math.max(left, Math.ceil(intersections[index] - 0.5))
      const end = Math.min(right, Math.ceil(intersections[index + 1] - 0.5))

      if (end > start) {
        const rowOffset = row * width
        const startIndex = rowOffset + start - left
        const endIndex = rowOffset + end - left

        pixels.fill(1, startIndex, endIndex)
      }
    }
  }

  // Pixel corners need one more column than pixel centers to give every vertex a unique row-major key.
  const stride = width + 1
  const edges = new Map()

  function addEdge (from, to, direction) {
    if (!edges.has(from)) edges.set(from, [])

    edges.get(from).push({ to, direction })
  }

  // Clockwise edges keep filled pixels to the right; holes wind the other way.
  // Directions increase clockwise in screen coordinates: right, down, left, up.
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixel = y * width + x
      if (!pixels[pixel]) continue

      const topLeft = y * stride + x
      const topRight = topLeft + 1
      const bottomRight = topLeft + stride + 1
      const bottomLeft = topLeft + stride

      // Shared edges are internal to the filled area and must not appear in its contour.
      if (y === 0 || !pixels[pixel - width]) addEdge(topLeft, topRight, 0)
      if (x === width - 1 || !pixels[pixel + 1]) addEdge(topRight, bottomRight, 1)
      if (y === height - 1 || !pixels[pixel + width]) addEdge(bottomRight, bottomLeft, 2)
      if (x === 0 || !pixels[pixel - 1]) addEdge(bottomLeft, topLeft, 3)
    }
  }

  const svgX = vertex => (left + vertex % stride) * MAP_PIXEL_SIZE
  const svgY = vertex => (top + Math.floor(vertex / stride)) * MAP_PIXEL_SIZE
  const paths = []

  // Relative turns are straight/right/back/left. Prefer right, then straight, left, and finally back
  // so pixels that touch only at a corner stay in separate contours instead of joining diagonally.
  const turnPriority = [1, 0, 3, 2]

  while (edges.size) {
    // Map insertion order keeps contour serialization deterministic.
    const start = edges.keys().next().value
    let vertex = start
    let direction = null
    let pendingSegment = ''
    let result = `M${svgX(start)},${svgY(start)}`

    do {
      const choices = edges.get(vertex)
      if (!choices?.length) throw new Error('Open mosaic contour')

      let choice = 0

      if (direction !== null) {
        choice = choices.reduce((bestIndex, candidate, index) => {
          const candidateTurn = (candidate.direction - direction + 4) % 4
          const bestTurn = (choices[bestIndex].direction - direction + 4) % 4
          const preferredTurn = turnPriority[candidateTurn] < turnPriority[bestTurn]

          return preferredTurn ? index : bestIndex
        }, 0)
      }

      const next = choices.splice(choice, 1)[0]
      if (!choices.length) edges.delete(vertex)

      // Keep only the endpoint of each straight run, flushing it when the contour turns or closes.
      if (next.direction !== direction) {
        result += pendingSegment
        direction = next.direction
      }

      vertex = next.to
      pendingSegment = direction % 2 ? `V${svgY(vertex)}` : `H${svgX(vertex)}`
    } while (vertex !== start)

    paths.push(result + pendingSegment + 'Z')
  }

  return paths.join(' ')
}
