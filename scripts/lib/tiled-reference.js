const TILE_SIZE = 40

/** Place a reference label over the largest visible part of a country. */
function labelPoint (map, region) {
  let largest = 0
  let point = null

  for (const polygon of region.polygons) {
    const xs = polygon[0].map(vertex => vertex[0])
    const ys = polygon[0].map(vertex => vertex[1])
    const left = Math.max(0, Math.min(...xs))
    const right = Math.min(map.width, Math.max(...xs))
    const top = Math.max(0, Math.min(...ys))
    const bottom = Math.min(map.height, Math.max(...ys))
    const area = (right - left) * (bottom - top)

    if (right <= left || bottom <= top || area <= largest) continue

    largest = area
    point = [(left + right) / 2, (top + bottom) / 2]
  }

  return point
}

/** Editor-only geography at the same scale as the 40-pixel Tiled grid. */
export function geographyReference (map) {
  const width = map.width * TILE_SIZE
  const height = map.height * TILE_SIZE
  const lines = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    '  <g fill="black" fill-opacity="0.12" fill-rule="evenodd" stroke="black" stroke-opacity="0.7" stroke-width="1.5">'
  ]

  // Use all land, including neighboring countries that are not eligible destinations.
  for (const region of map.landRegions) {
    lines.push(`    <path d="${region.path}"/>`)
  }

  lines.push('  </g>')
  lines.push('  <g fill="black" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">')

  for (const region of map.regions) {
    // Only destination country codes are labeled; skip non-country source features.
    if (!/^[A-Z]{3}$/.test(region.id)) continue

    const point = labelPoint(map, region)
    if (!point) continue

    const x = (point[0] * TILE_SIZE).toFixed(2)
    const y = (point[1] * TILE_SIZE).toFixed(2)
    lines.push(`    <text x="${x}" y="${y}">${region.id}</text>`)
  }

  lines.push('  </g>', '</svg>', '')

  return lines.join('\n')
}
