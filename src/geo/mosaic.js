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
    if (command === 'Z') continue
    if (command !== 'M' && command !== 'L') throw new Error('Expected a projected polygon path')
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
  left = Math.max(Math.floor(left), Math.ceil(bounds[0] / MAP_PIXEL_SIZE))
  top = Math.max(Math.floor(top), Math.ceil(bounds[1] / MAP_PIXEL_SIZE))
  right = Math.min(Math.ceil(right), Math.floor(bounds[2] / MAP_PIXEL_SIZE))
  bottom = Math.min(Math.ceil(bottom), Math.floor(bounds[3] / MAP_PIXEL_SIZE))
  const width = right - left
  const height = bottom - top
  if (width <= 0 || height <= 0) return ''
  // Bound developer-tool allocations even for malformed projections.
  if (!Number.isSafeInteger(width * height) || width * height > 4000000) throw new Error('Mosaic bounds are too large')
  const pixels = new Uint8Array(width * height)
  for (let row = 0; row < height; row++) {
    const y = top + row + 0.5
    const intersections = []
    for (const ring of rings) {
      for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
        const [x1, y1] = ring[previous]
        const [x2, y2] = ring[index]
        if ((y1 > y) !== (y2 > y)) intersections.push(x1 + (y - y1) * (x2 - x1) / (y2 - y1))
      }
    }
    intersections.sort((a, b) => a - b)
    for (let index = 0; index + 1 < intersections.length; index += 2) {
      const start = Math.max(left, Math.ceil(intersections[index] - 0.5))
      const end = Math.min(right, Math.ceil(intersections[index + 1] - 0.5))
      if (end > start) pixels.fill(1, row * width + start - left, row * width + end - left)
    }
  }

  // Clockwise edges keep filled pixels to the right; holes wind the other way.
  const stride = width + 1
  const edges = new Map()
  function edge (from, to, direction) {
    if (!edges.has(from)) edges.set(from, [])
    edges.get(from).push({ to, direction })
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixel = y * width + x
      if (!pixels[pixel]) continue
      const a = y * stride + x
      const b = a + 1
      const c = a + stride + 1
      const d = a + stride
      if (y === 0 || !pixels[pixel - width]) edge(a, b, 0)
      if (x === width - 1 || !pixels[pixel + 1]) edge(b, c, 1)
      if (y === height - 1 || !pixels[pixel + width]) edge(c, d, 2)
      if (x === 0 || !pixels[pixel - 1]) edge(d, a, 3)
    }
  }
  const svgX = vertex => (left + vertex % stride) * MAP_PIXEL_SIZE
  const svgY = vertex => (top + Math.floor(vertex / stride)) * MAP_PIXEL_SIZE
  const paths = []
  const turnPriority = [1, 0, 3, 2]
  while (edges.size) {
    const start = edges.keys().next().value
    let vertex = start
    let direction = null
    let segment = ''
    let result = `M${svgX(start)},${svgY(start)}`
    do {
      const choices = edges.get(vertex)
      if (!choices?.length) throw new Error('Open mosaic contour')
      const choice = direction === null ? 0 : choices.reduce((best, candidate, index) =>
        turnPriority[(candidate.direction - direction + 4) % 4] < turnPriority[(choices[best].direction - direction + 4) % 4] ? index : best, 0)
      const next = choices.splice(choice, 1)[0]
      if (!choices.length) edges.delete(vertex)
      if (next.direction !== direction) {
        result += segment
        direction = next.direction
      }
      vertex = next.to
      segment = direction % 2 ? `V${svgY(vertex)}` : `H${svgX(vertex)}`
    } while (vertex !== start)
    paths.push(result + segment + 'Z')
  }
  return paths.join(' ')
}
