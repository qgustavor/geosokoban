import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { gunzipSync } from 'node:zlib'
import atlas from '../src/content/scenery-atlas.json' with { type: 'json' }
import { REGIONS, CARIBBEAN } from '../src/content/regions.js'
import { MAP_VERSION, rasterize, countryAt } from '../src/geo/rasterize.js'
import { setGeography } from '../src/geo/world.js'
import { createBiomeLookup, sampleRegion } from './lib/biome-sampling.js'

assert.equal(atlas.mapVersion, MAP_VERSION, 'The scenery projection is stale')
assert.equal(atlas.version, 1)
if (atlas.status !== 'prepared') {
  console.warn('Biome atlas is unprepared: the game uses neutral scenery. Run npm run biomes:prepare.')
  if (process.argv.includes('--require-data')) process.exitCode = 1
} else {
  assert.equal(atlas.source.license, 'CC-BY-4.0')
  assert.ok(atlas.source.ecoregions >= 800)
  assert.equal(Object.keys(atlas.regions).length, 8)
  assert.match(atlas.source.sha256, /^[a-f0-9]{64}$/)
  for (const definition of [...REGIONS, CARIBBEAN]) {
    const map = atlas.regions[definition.id]
    assert.equal(map.width, definition.width)
    assert.equal(map.height, definition.height)
    assert.equal(map.cells.length, definition.width * definition.height)
    for (const cell of map.cells.filter(Boolean)) {
      assert.ok(atlas.ecoregions[cell[0]])
      assert.ok(cell[1] === null || atlas.ecoregions[cell[1]])
      assert.ok(cell[2] >= 0 && cell[2] <= 1)
      assert.ok(cell[3] > 0 && cell[3] <= 1)
    }
  }
  console.log('Biome atlas schema and projections are valid.')
  if (process.argv.includes('--reproduce')) {
    const bytes = gunzipSync(await readFile(new URL('../data-sources/resolve-2017.geojson.gz', import.meta.url)))
    assert.equal(createHash('sha256').update(bytes).digest('hex'), atlas.source.sha256)
    const lookup = createBiomeLookup(JSON.parse(bytes))
    setGeography(JSON.parse(gunzipSync(await readFile(new URL('../src/data/world.geojson.gz', import.meta.url)))))
    for (const definition of [...REGIONS, CARIBBEAN]) {
      const map = rasterize(definition.id)
      assert.deepEqual(sampleRegion(definition, lookup, (x, y) => countryAt(map, x, y) !== null), atlas.regions[definition.id])
    }
    console.log('Biome atlas exactly matches the cached source snapshot.')
  }
}
