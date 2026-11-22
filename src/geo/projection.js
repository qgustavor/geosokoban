/** The same equirectangular projection used by the puzzle rasterizer. */
export function projectionFor ({ bounds, width, height }) {
  const [west, south, east, north] = bounds

  // Longitude spans shrink toward the poles; use the region's middle latitude for one fixed scale.
  const middleLatitude = (north + south) / 2
  const latitudeRadians = middleLatitude * Math.PI / 180
  const cosine = Math.cos(latitudeRadians)
  const spanX = (east - west) * cosine
  const spanY = north - south

  // Fit both axes without stretching, leaving at least one gameplay cell of padding on each side.
  const horizontalScale = (width - 2) / spanX
  const verticalScale = (height - 2) / spanY
  const scale = Math.min(horizontalScale, verticalScale)
  const padX = (width - spanX * scale) / 2
  const padY = (height - spanY * scale) / 2

  const project = ([longitude, latitude]) => {
    // Pacific bounds extend past 180 degrees, so negative longitudes belong to the next world copy.
    if (east > 180 && longitude < 0) longitude += 360

    const x = padX + (longitude - west) * cosine * scale
    // Latitude increases northward, but board rows increase downward.
    const y = padY + (north - latitude) * scale

    return [x, y]
  }

  const unproject = ([x, y]) => {
    const longitude = west + (x - padX) / (cosine * scale)
    // The second remainder makes wrapping work for negative longitudes too: the result is [-180, 180).
    const wrappedLongitude = ((longitude + 180) % 360 + 360) % 360 - 180
    const latitude = north - (y - padY) / scale

    return [wrappedLongitude, latitude]
  }

  return { project, unproject }
}

/** Project physical geography independently of which countries a puzzle can select. */
export function projectRegions (world, definition, margin = 0) {
  const { project } = projectionFor(definition)
  const { width, height } = definition
  const centerLongitude = (definition.bounds[0] + definition.bounds[2]) / 2

  const features = world.features.map(feature => {
    const geometry = feature.geometry
    if (!geometry || !['Polygon', 'MultiPolygon'].includes(geometry.type)) return null

    // Normalize both geometry types to polygons containing an outer ring followed by any holes.
    const sourcePolygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
    const polygons = sourcePolygons.flatMap(polygon => {
      const unwrapped = polygon.map(ring => {
        let previousLongitude = ring[0][0]

        // Keep successive vertices on adjacent longitudes so a date-line crossing is not a world-wide edge.
        return ring.map(([longitude, latitude]) => {
          while (longitude - previousLongitude > 180) longitude -= 360
          while (longitude - previousLongitude < -180) longitude += 360

          previousLongitude = longitude

          return [longitude, latitude]
        })
      })

      const longitudeSum = unwrapped[0].reduce((sum, point) => sum + point[0], 0)
      const middleLongitude = longitudeSum / unwrapped[0].length
      const offset = Math.round((centerLongitude - middleLongitude) / 360) * 360
      const copies = []

      // Start near this board, then include neighboring world copies for context beyond either edge.
      for (const extra of [-360, 0, 360]) {
        const projectPoint = ([longitude, latitude]) => {
          const shiftedLongitude = longitude + offset + extra
          const point = project([shiftedLongitude, latitude])

          // project() wraps negative longitudes in Pacific maps. Undo that only for these explicit copies.
          if (definition.bounds[2] > 180 && shiftedLongitude < 0) {
            const worldStart = project([0, latitude])
            const worldEnd = project([360, latitude])
            const worldWidth = worldEnd[0] - worldStart[0]

            point[0] -= worldWidth
          }

          return point
        }

        const copy = unwrapped.map(ring => ring.map(projectPoint))
        copies.push(copy)
      }

      return copies.filter(polygon => {
        // Only the outer ring is needed to bound a polygon; holes cannot extend its visible footprint.
        const xs = polygon[0].map(point => point[0])
        const ys = polygon[0].map(point => point[1])
        const overlapsHorizontally = Math.min(...xs) <= width + margin && Math.max(...xs) >= -margin

        if (!overlapsHorizontally) return false

        return Math.min(...ys) <= height + margin && Math.max(...ys) >= -margin
      })
    })

    if (!polygons.length) return null

    const ringPaths = polygons.flatMap(polygon => polygon.map(ring => {
      const vertices = ring.map(([x, y], index) => {
        const command = index ? 'L' : 'M'
        // Projection coordinates are gameplay cells; rendered paths use 40 SVG units per cell.
        const svgX = (x * 40).toFixed(2)
        const svgY = (y * 40).toFixed(2)

        return `${command}${svgX},${svgY}`
      })

      return vertices.join(' ') + 'Z'
    }))
    const path = ringPaths.join(' ')

    return { id: feature.properties.id, continent: feature.properties.continent, polygons, path }
  })

  return features.filter(Boolean)
}

/** Context extends beyond the puzzle to cover wide screens; it never creates floor. */
export function contextPaths (world, definition) {
  const margin = Math.max(definition.width, definition.height) * 3

  return projectRegions(world, definition, margin).map(({ id, path }) => ({ id, path }))
}
