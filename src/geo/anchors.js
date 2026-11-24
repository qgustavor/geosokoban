export const MAX_DOCK_DISTANCE = 2.8

/** Project onto a finite coastline segment in board-cell coordinates. */
function closestPointOnSegment (x, y, a, b) {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const lengthSquared = dx * dx + dy * dy

  // GeoJSON may repeat a vertex, including the closing point of a ring.
  if (!lengthSquared) return [...a]

  const projection = ((x - a[0]) * dx + (y - a[1]) * dy) / lengthSquared
  const t = Math.max(0, Math.min(1, projection))

  return [a[0] + t * dx, a[1] + t * dy]
}

/** Find an anchor on the named country's outer coastline, including small islands. */
export function findOffshoreAnchor (map, country, position) {
  const region = map.regions.find(region => region.id === country)
  if (!region) return null

  const x = position % map.width + 0.5
  const y = Math.floor(position / map.width) + 0.5
  let nearest = Infinity
  let anchor = null

  for (const polygon of region.polygons) {
    // The inner rings describe holes, not offshore coastlines.
    const ring = polygon[0]

    for (let i = 0; i < ring.length; i++) {
      const point = closestPointOnSegment(x, y, ring[i], ring[(i + 1) % ring.length])
      const distance = Math.hypot(x - point[0], y - point[1])

      // Retain the first point on ties for deterministic imports.
      if (distance < nearest) {
        nearest = distance
        anchor = point
      }
    }
  }

  return nearest <= MAX_DOCK_DISTANCE ? anchor : null
}
