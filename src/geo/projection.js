/** The same equirectangular projection used by the puzzle rasterizer. */
export function projectionFor ({ bounds, width, height }) {
  const [west, south, east, north] = bounds
  const cosine = Math.cos((north + south) / 2 * Math.PI / 180)
  const spanX = (east - west) * cosine
  const spanY = north - south
  const scale = Math.min((width - 2) / spanX, (height - 2) / spanY)
  const padX = (width - spanX * scale) / 2
  const padY = (height - spanY * scale) / 2
  const project = ([longitude, latitude]) => {
    if (east > 180 && longitude < 0) longitude += 360
    return [padX + (longitude - west) * cosine * scale, padY + (north - latitude) * scale]
  }
  const unproject = ([x, y]) => {
    const longitude = west + (x - padX) / (cosine * scale)
    return [((longitude + 180) % 360 + 360) % 360 - 180, north - (y - padY) / scale]
  }
  return { project, unproject }
}

/** Context extends beyond the puzzle to cover wide screens; it never creates floor. */
export function contextPaths (world, definition) {
  const { project } = projectionFor(definition)
  const { width, height } = definition
  const margin = Math.max(width, height) * 3
  const center = (definition.bounds[0] + definition.bounds[2]) / 2
  return world.features.map(feature => {
    const geometry = feature.geometry
    if (!geometry || !['Polygon', 'MultiPolygon'].includes(geometry.type)) return null
    const source = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
    const polygons = source.flatMap(polygon => {
      const unwrapped = polygon.map(ring => {
        let previous = ring[0][0]
        return ring.map(([longitude, latitude]) => {
          while (longitude - previous > 180) longitude -= 360
          while (longitude - previous < -180) longitude += 360
          previous = longitude
          return [longitude, latitude]
        })
      })
      const middle = unwrapped[0].reduce((sum, point) => sum + point[0], 0) / unwrapped[0].length
      const offset = Math.round((center - middle) / 360) * 360
      return [-360, 0, 360].map(extra => unwrapped.map(ring => ring.map(([longitude, latitude]) => {
        // project() wraps negative longitudes in Pacific maps; undo that for the context copies.
        const shifted = longitude + offset + extra
        const point = project([shifted, latitude])
        if (definition.bounds[2] > 180 && shifted < 0) {
          const a = project([0, latitude])
          const b = project([360, latitude])
          point[0] -= b[0] - a[0]
        }
        return point
      }))).filter(polygon => {
        const xs = polygon[0].map(point => point[0])
        const ys = polygon[0].map(point => point[1])
        return Math.min(...xs) <= width + margin && Math.max(...xs) >= -margin && Math.min(...ys) <= height + margin && Math.max(...ys) >= -margin
      })
    })
    if (!polygons.length) return null
    const path = polygons.flatMap(polygon => polygon.map(ring => ring.map(([x, y], index) =>
      `${index ? 'L' : 'M'}${(x * 40).toFixed(2)},${(y * 40).toFixed(2)}`).join(' ') + 'Z')).join(' ')
    return { id: feature.properties.id, path }
  }).filter(Boolean)
}
