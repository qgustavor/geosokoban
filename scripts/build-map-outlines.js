import { readFile, writeFile } from 'node:fs/promises'
import { gunzipSync } from 'node:zlib'
import { REGIONS, CARIBBEAN } from '../src/content/regions.js'
import { contextPaths } from '../src/geo/projection.js'
import { setGeography } from '../src/geo/world.js'
import { rasterize, MAP_VERSION } from '../src/geo/rasterize.js'

const output = new URL('../src/content/map-outlines.json', import.meta.url)
const world = new URL('../src/data/world.geojson.gz', import.meta.url)
const geography = JSON.parse(gunzipSync(await readFile(world)))
setGeography(geography)

// Country outlines depend on the projection, not the land-coverage threshold.
const regions = Object.fromEntries([...REGIONS, CARIBBEAN].map(definition => {
  const map = rasterize(definition.id)
  return [definition.id, {
    width: map.width,
    height: map.height,
    context: contextPaths(geography, definition),
    regions: map.regions.map(({ id, path }) => ({ id, path }))
  }]
}))
const serialized = JSON.stringify({ mapVersion: MAP_VERSION, tileSize: 40, regions }) + '\n'

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
