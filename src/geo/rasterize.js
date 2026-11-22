import { getGeography } from './world.js'
import { projectRegions } from './projection.js'
import { regionById } from '../content/regions.js'
import { DIRECTIONS, neighbor } from '../core/engine.js'

export const MAP_VERSION = 'world-map'

// Coverage samples belong to a region; playable floors also depend on its requested threshold.
const cache = new Map()
const sampled = new Map()
let geographySource

function pointInRing (x, y, ring) {
  let inside = false

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]

    // A horizontal ray toggles membership at each crossing. This half-open test counts a vertex
    // only once and skips horizontal edges before dividing by their vertical span.
    const crossesRow = (yi > y) !== (yj > y)
    if (!crossesRow) continue

    const crossingX = (xj - xi) * (y - yi) / (yj - yi) + xi
    if (x < crossingX) inside = !inside
  }

  return inside
}

export function countryAt (map, x, y) {
  // Feature order breaks any overlaps: the first containing country wins.
  const country = (map.landRegions ?? map.regions).find(region => region.polygons.some(polygon => {
    const insideOutline = pointInRing(x, y, polygon[0])
    if (!insideOutline) return false

    // GeoJSON rings after the outer boundary are holes, not additional pieces of land.
    const insideHole = polygon.slice(1).some(ring => pointInRing(x, y, ring))

    return !insideHole
  }))

  return country?.id ?? null
}

function largestComponent (shape, candidates) {
  let largest = []
  const seen = new Set()

  for (const start of candidates) {
    if (seen.has(start)) continue

    const component = [start]
    seen.add(start)

    // The growing component doubles as the queue. Only orthogonal steps can connect playable cells.
    for (let index = 0; index < component.length; index++) {
      for (const direction of DIRECTIONS) {
        const next = neighbor(shape, component[index], direction)

        if (candidates.has(next) && !seen.has(next)) {
          seen.add(next)
          component.push(next)
        }
      }
    }

    // Keep the first component on ties; changing that choice would change seeded boards.
    if (component.length > largest.length) largest = component
  }

  // Floor indices have a stable row-major order regardless of the flood-fill traversal.
  return largest.sort((a, b) => a - b)
}

function projectedMap (definition) {
  const { width, height } = definition
  const landRegions = projectRegions(getGeography(), definition)
  const regions = landRegions.filter(region => {
    return region.continent === definition.continent || definition.extraCountries?.includes(region.id)
  })

  // All neighboring land blocks boats, including countries not eligible for
  // destinations. The eligible subset still defines land-board floor and goals.
  return { width, height, landRegions, regions, definition }
}

export function rasterize (regionId = 'SA', threshold = 0.36) {
  // A warm worker may receive a different fixture (or an updated map).
  const source = getGeography()

  if (source !== geographySource) {
    cache.clear()
    sampled.clear()
    geographySource = source
  }

  const key = `${regionId}:${threshold}`
  if (cache.has(key)) return cache.get(key)

  const definition = regionById(regionId)
  if (!definition) throw new Error('Unknown region')

  let sample = sampled.get(regionId)

  if (!sample) {
    const map = projectedMap(definition)
    const cells = []
    const terrain = definition.sea ? map : { regions: map.regions }

    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        let land = 0

        // A fixed 4x4 set of subcell centers estimates coverage without sampling on subcell edges.
        for (let sy = 0; sy < 4; sy++) {
          for (let sx = 0; sx < 4; sx++) {
            const sampleX = x + (sx + 0.5) / 4
            const sampleY = y + (sy + 0.5) / 4

            if (countryAt(terrain, sampleX, sampleY)) land++
          }
        }

        const position = y * map.width + x
        const coverage = land / 16
        // Country ownership uses the cell center, not whichever country supplied most coverage samples.
        const country = countryAt(terrain, x + 0.5, y + 0.5)

        cells.push({ position, coverage, country })
      }
    }

    sample = { map, cells }
    sampled.set(regionId, sample)
  }

  // Threshold retries reuse projection and the expensive polygon sampling.
  const { map, cells } = sample
  const playableCells = cells.filter(cell => {
    if (!definition.sea) return cell.coverage >= threshold

    // Sea puzzles navigate water around islands rather than connecting the islands with invented land.
    // Require both a water center and low land coverage; a coast-straddling cell can satisfy only one.
    const isWater = cell.country === null && cell.coverage < threshold
    if (!isWater) return false

    // Keep the outermost row and column non-playable even when they are water.
    const column = cell.position % map.width
    const insideColumns = column > 0 && column < map.width - 1
    if (!insideColumns) return false

    return cell.position >= map.width && cell.position < map.width * (map.height - 1)
  })
  const candidates = new Set(playableCells.map(cell => cell.position))

  const result = {
    ...map,
    cells,
    floors: largestComponent(map, candidates),
    threshold,
    sea: definition.sea === true
  }
  cache.set(key, result)

  return result
}
