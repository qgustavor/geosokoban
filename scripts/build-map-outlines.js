import { readFile, writeFile } from 'node:fs/promises'
import { gunzipSync } from 'node:zlib'
import { REGIONS } from '../src/content/regions.js'
import { contextPaths } from '../src/geo/projection.js'
import { mosaicPath, MAP_PIXELS_PER_CELL, MAP_TILE_SIZE } from '../src/geo/mosaic.js'
import { setGeography } from '../src/geo/world.js'
import { rasterize, MAP_VERSION } from '../src/geo/rasterize.js'

const output = new URL('../src/content/map-outlines.json', import.meta.url)
const world = new URL('../src/data/world.geojson.gz', import.meta.url)
const geography = JSON.parse(gunzipSync(await readFile(world)))
setGeography(geography)

// Pixel coasts and borders share the gameplay origin, independent of floor thresholds.
const regions = Object.fromEntries([...REGIONS].map(definition => {
  const map = rasterize(definition.id)
  const margin = Math.max(map.width, map.height) * 3
  const bounds = [-margin, -margin, map.width + margin, map.height + margin].map(value => value * MAP_TILE_SIZE)

  const pixels = regions => {
    const paths = regions.map(({ id, path }) => ({ id, path: mosaicPath(path, bounds) }))
    // Clipping can erase an entire polygon; omit it rather than emitting an empty SVG path.
    return paths.filter(region => region.path)
  }

  return [definition.id, {
    width: map.width,
    height: map.height,
    context: pixels(contextPaths(geography, definition)),
    regions: pixels(map.regions)
  }]
}))

const atlas = {
  mapVersion: MAP_VERSION,
  tileSize: MAP_TILE_SIZE,
  pixelsPerCell: MAP_PIXELS_PER_CELL,
  regions
}
const serialized = JSON.stringify(atlas) + '\n'

await writeFile(output, serialized)
console.log(`Saved outlines for ${Object.keys(regions).length} map projections.`)
