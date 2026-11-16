import { readFile, writeFile } from 'node:fs/promises'
import { gunzipSync } from 'node:zlib'
import { REGIONS, CARIBBEAN } from '../src/content/regions.js'
import { contextPaths } from '../src/geo/projection.js'
import { mosaicPath, MAP_PIXELS_PER_CELL, MAP_TILE_SIZE } from '../src/geo/mosaic.js'
import { setGeography } from '../src/geo/world.js'
import { rasterize, MAP_VERSION } from '../src/geo/rasterize.js'

const output = new URL('../src/content/map-outlines.json', import.meta.url)
const world = new URL('../src/data/world.geojson.gz', import.meta.url)
const geography = JSON.parse(gunzipSync(await readFile(world)))
setGeography(geography)

// Pixel coasts and borders share the gameplay origin, independent of floor thresholds.
const regions = Object.fromEntries([...REGIONS, CARIBBEAN].map(definition => {
  const map = rasterize(definition.id)
  const margin = Math.max(map.width, map.height) * 3
  const bounds = [-margin, -margin, map.width + margin, map.height + margin].map(value => value * MAP_TILE_SIZE)
  const pixels = regions => regions.map(({ id, path }) => ({ id, path: mosaicPath(path, bounds) })).filter(region => region.path)
  return [definition.id, {
    width: map.width,
    height: map.height,
    context: pixels(contextPaths(geography, definition)),
    regions: pixels(map.regions)
  }]
}))
const serialized = JSON.stringify({ mapVersion: MAP_VERSION, tileSize: MAP_TILE_SIZE, pixelsPerCell: MAP_PIXELS_PER_CELL, regions }) + '\n'

if (process.argv.includes('--check')) {
  const existing = await readFile(output, 'utf8').catch(() => '')
  if (existing !== serialized) {
    console.error('Map outlines are stale or missing. Run npm run maps:outlines.')
    process.exitCode = 1
  } else console.log('Map outlines match the bundled geography and projections.')
} else {
  await writeFile(output, serialized)
  console.log(`Saved outlines for ${Object.keys(regions).length} map projections.`)
}
