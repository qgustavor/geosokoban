import { getGeography } from './world.js'
import { projectionFor } from './projection.js'
import { regionById } from '../content/regions.js'
import { DIRECTIONS, neighbor } from '../core/engine.js'

export const MAP_VERSION = 'world-fixture-v2'
const cache = new Map()

function pointInRing (x, y, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

export function countryAt (map, x, y) {
  return map.regions.find(region => region.polygons.some(polygon =>
    pointInRing(x, y, polygon[0]) && !polygon.slice(1).some(ring => pointInRing(x, y, ring))
  ))?.id ?? null
}

export function largestComponent (shape, candidates) {
  let largest = []
  const seen = new Set()
  for (const start of candidates) {
    if (seen.has(start)) continue
    const component = [start]
    seen.add(start)
    for (let index = 0; index < component.length; index++) {
      for (const direction of DIRECTIONS) {
        const next = neighbor(shape, component[index], direction)
        if (candidates.has(next) && !seen.has(next)) {
          seen.add(next)
          component.push(next)
        }
      }
    }
    if (component.length > largest.length) largest = component
  }
  return largest.sort((a, b) => a - b)
}

function projectedMap (definition) {
  const { width, height } = definition
  const { project } = projectionFor(definition)
  const regions = getGeography().features.filter(feature =>
    definition.countries ? definition.countries.includes(feature.properties.id) : feature.properties.continent === definition.continent || definition.extraCountries?.includes(feature.properties.id)
  ).map(feature => {
    const geometry = feature.geometry
    const polygons = (geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates)
      .map(polygon => polygon.map(ring => ring.map(project)))
      .filter(polygon => polygon[0].some(([x, y]) => x >= 0 && x <= width && y >= 0 && y <= height))
    const path = polygons.flatMap(polygon => polygon.map(ring =>
      ring.map(([x, y], index) => `${index ? 'L' : 'M'}${(x * 40).toFixed(2)},${(y * 40).toFixed(2)}`).join(' ') + 'Z'
    )).join(' ')
    return { id: feature.properties.id, polygons, path }
  }).filter(region => region.polygons.length)
  return { width, height, regions, definition }
}

export function rasterize (regionId = 'SA', threshold = 0.36) {
  const key = `${regionId}:${threshold}`
  if (cache.has(key)) return cache.get(key)
  const definition = regionById(regionId)
  if (!definition) throw new Error('Unknown region')
  const map = projectedMap(definition)
  const cells = []
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      let land = 0
      for (let sy = 0; sy < 4; sy++) {
        for (let sx = 0; sx < 4; sx++) {
          if (countryAt(map, x + (sx + 0.5) / 4, y + (sy + 0.5) / 4)) land++
        }
      }
      cells.push({ position: y * map.width + x, coverage: land / 16, country: countryAt(map, x + 0.5, y + 0.5) })
    }
  }
  // Sea puzzles keep a navigable border around islands, rather than inventing land bridges.
  const candidates = new Set(cells.filter(cell => definition.sea
    ? cell.country === null && cell.coverage < threshold && cell.position % map.width > 0 && cell.position % map.width < map.width - 1 && cell.position >= map.width && cell.position < map.width * (map.height - 1)
    : cell.coverage >= threshold).map(cell => cell.position))
  const result = { ...map, cells, floors: largestComponent(map, candidates), threshold, sea: definition.sea === true }
  cache.set(key, result)
  return result
}
