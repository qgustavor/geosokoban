import { projectionFor } from '../../src/geo/projection.js'

function ringContains (x, y, ring) {
  let inside = false

  // Cast a horizontal ray; only edges spanning this latitude can change inside/outside parity.
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    const spansLatitude = (yi > y) !== (yj > y)
    if (!spansLatitude) continue

    // The span check also excludes horizontal edges, avoiding division by zero.
    const intersectionX = (xj - xi) * (y - yi) / (yj - yi) + xi
    if (x < intersectionX) inside = !inside
  }

  return inside
}

function unwrap (ring) {
  let previous = ring[0][0]

  // Keep consecutive points in the nearest world copy so a dateline crossing stays a short edge.
  return ring.map(([x, y]) => {
    while (x - previous > 180) x -= 360
    while (x - previous < -180) x += 360
    previous = x
    return [x, y]
  })
}

/** Longitude buckets narrow the search; holes and antimeridian rings remain explicit. */
export function createBiomeLookup (collection) {
  const validCollection = collection?.type === 'FeatureCollection' &&
    Array.isArray(collection.features) && collection.features.length

  if (!validCollection) throw new Error('Expected nonempty ecoregion GeoJSON')

  const records = {}
  const buckets = new Map()

  for (const feature of collection.features) {
    const properties = feature.properties ?? {}
    const id = Number(properties.ECO_ID)
    const biome = Number(properties.BIOME_NUM)
    const validAttributes = Number.isSafeInteger(id) && Number.isFinite(biome) &&
      typeof properties.ECO_NAME === 'string'

    if (!validAttributes) throw new Error('Ecoregion attributes are missing or invalid')

    records[id] = { name: properties.ECO_NAME, biome, realm: String(properties.REALM ?? '') }
    if (!feature.geometry) continue

    const { type, coordinates } = feature.geometry
    if (!['Polygon', 'MultiPolygon'].includes(type)) throw new Error('Ecoregions must contain polygon geometry')

    const polygons = type === 'Polygon' ? [coordinates] : coordinates

    for (const source of polygons) {
      if (!source.length || !source[0].length) continue

      const rings = source.map(unwrap)
      const middle = rings[0].reduce((sum, point) => sum + point[0], 0) / rings[0].length

      // Align holes with their outer ring; unwrapping them independently may choose another world copy.
      for (const ring of rings.slice(1)) {
        const shift = Math.round((middle - ring[0][0]) / 360) * 360
        for (const point of ring) point[0] += shift
      }

      let west = Infinity
      let east = -Infinity
      let south = Infinity
      let north = -Infinity
      for (const [x, y] of rings[0]) {
        west = Math.min(west, x)
        east = Math.max(east, x)
        south = Math.min(south, y)
        north = Math.max(north, y)
      }

      const polygon = { id, rings, west, east, south, north }
      // Five-degree buckets are an acceleration index, not the final containment test.
      for (let bucket = Math.floor(west / 5); bucket <= Math.floor(east / 5); bucket++) {
        if (!buckets.has(bucket)) buckets.set(bucket, [])
        buckets.get(bucket).push(polygon)
      }
    }
  }

  function at (longitude, latitude) {
    const found = new Set()

    // Search adjacent world copies too, since a polygon may straddle the antimeridian.
    for (const x of [longitude, longitude - 360, longitude + 360]) {
      for (const polygon of buckets.get(Math.floor(x / 5)) ?? []) {
        if (x < polygon.west || x > polygon.east || latitude < polygon.south || latitude > polygon.north) continue

        const insideOuterRing = ringContains(x, latitude, polygon.rings[0])
        if (!insideOuterRing) continue

        const insideHole = polygon.rings.slice(1).some(ring => ringContains(x, latitude, ring))
        if (!insideHole) found.add(polygon.id)
      }
    }

    // Stable numeric priority resolves overlaps independently of the source feature order.
    return [...found].sort((a, b) => a - b)[0] ?? null
  }

  return { at, records }
}

/** Samples are masked by the same country geometry as the game, not by national labels. */
export function sampleRegion (definition, lookup, landAt, samples = 4) {
  const { unproject } = projectionFor(definition)
  const cells = []

  for (let position = 0; position < definition.width * definition.height; position++) {
    const x = position % definition.width
    const y = Math.floor(position / definition.width)
    const counts = new Map()
    let land = 0
    let classified = 0

    // Sample subcell centers to avoid bias toward tile edges and shared polygon boundaries.
    for (let sy = 0; sy < samples; sy++) {
      for (let sx = 0; sx < samples; sx++) {
        const px = x + (sx + 0.5) / samples
        const py = y + (sy + 0.5) / samples
        if (!landAt(px, py)) continue
        land++
        const id = lookup.at(...unproject([px, py]))
        if (id === null) continue
        classified++
        counts.set(id, (counts.get(id) ?? 0) + 1)
      }
    }

    // Prefer more samples, then the lower ecoregion ID when counts tie.
    const ranked = [...counts].sort((a, b) => b[1] - a[1] || a[0] - b[0])
    if (!ranked.length) {
      cells.push(null)
      continue
    }

    const primary = ranked[0][0]
    const secondary = ranked[1]?.[0] ?? null
    // Coverage measures classified land; dominance measures the primary share of classified samples.
    const coverage = Number((classified / land).toFixed(3))
    const dominance = Number((ranked[0][1] / classified).toFixed(3))
    cells.push([primary, secondary, coverage, dominance])
  }

  return { width: definition.width, height: definition.height, cells }
}
