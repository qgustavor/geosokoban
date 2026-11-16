import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'
import { outlinesForLevel } from '../src/geo/outlines.js'
import { mosaicPath, MAP_PIXELS_PER_CELL, MAP_TILE_SIZE } from '../src/geo/mosaic.js'
import { getGeography } from '../src/geo/world.js'
import stories from '../src/content/story-levels.json' with { type: 'json' }
import fallbacks from '../src/content/fallback-levels-v4.json' with { type: 'json' }
import atlas from '../src/content/map-outlines.json' with { type: 'json' }

const root = new URL('../', import.meta.url)

// This test file never initializes the world singleton in its own process.
test('menu preview and all fixed boards have country paths before geography loads', () => {
  assert.throws(() => getGeography(), /Geography must be loaded/)
  for (const level of [stories['G2-SA-S3'], ...Object.values(stories), ...Object.values(fallbacks)]) {
    const paths = outlinesForLevel(level)
    assert.ok(paths.length, level.id)
    assert.equal(new Set(paths.map(region => region.id)).size, paths.length)
    for (const region of paths) {
      assert.match(region.id, /^[A-Z]{3}$/)
      assert.match(region.path, /^M/)
      assert.doesNotMatch(region.path, /NaN|Infinity|undefined/)
    }
    for (const goal of level.goals) assert.ok(paths.some(region => region.id === goal.country), `${level.id}:${goal.country}`)
  }
  assert.throws(() => getGeography(), /Geography must be loaded/)
})

test('threshold changes reuse outlines without changing floors or puzzle state', () => {
  const level = stories['G2-SA-S3']
  const before = structuredClone(level)
  for (const threshold of [0.12, 0.24, 0.36, 0.48]) {
    assert.equal(outlinesForLevel({ ...level, threshold }), outlinesForLevel(level))
  }
  assert.deepEqual(level, before)
})

test('unknown map versions, regions or dimensions do not display misaligned country paths', () => {
  const level = stories['G2-SA-S3']
  for (const change of [{ mapVersion: 'unknown' }, { region: 'unknown' }, { width: 999 }, { height: 999 }]) {
    assert.deepEqual(outlinesForLevel({ ...level, ...change }), [])
  }
})

test('the atlas covers the eight existing projections and contains only rendering data', () => {
  assert.equal(atlas.tileSize, 40)
  assert.equal(atlas.pixelsPerCell, MAP_PIXELS_PER_CELL)
  assert.deepEqual(Object.keys(atlas.regions).sort(), ['AF', 'AS', 'CAR', 'EE', 'NA', 'OC', 'SA', 'WE'])
  for (const map of Object.values(atlas.regions)) {
    assert.deepEqual(Object.keys(map).sort(), ['context', 'height', 'regions', 'width'])
    for (const region of map.regions) assert.deepEqual(Object.keys(region).sort(), ['id', 'path'])
  }
})

test('the committed atlas is reproducible from the bundled world and projection code', () => {
  const output = execFileSync(process.execPath, ['scripts/build-map-outlines.js', '--check'], { cwd: root, encoding: 'utf8' })
  assert.match(output, /Map outlines match/)
  assert.throws(() => getGeography(), /Geography must be loaded/)
})

test('board rendering cannot import the world loader or rasterizer through local dependencies', () => {
  const visited = new Set()
  function visit (url) {
    const path = fileURLToPath(url)
    if (visited.has(path) || path.endsWith('.json')) return
    visited.add(path)
    assert.doesNotMatch(path, /\/(?:world|rasterize)\.js$/)
    const source = readFileSync(url, 'utf8')
    for (const match of source.matchAll(/\bfrom\s+['"](\.[^'"]+)['"]/g)) visit(new URL(match[1], url))
    assert.doesNotMatch(source, /\b(?:fetch|loadGeography|getGeography|rasterize)\s*\(/)
  }
  visit(new URL('../src/ui/GameBoard.vue', import.meta.url))
  assert.ok(visited.has(fileURLToPath(new URL('../src/geo/outlines.js', import.meta.url))))
})

test('the original failure is reproduced with an unloaded rasterizer in a fresh process', () => {
  const output = execFileSync(process.execPath, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict'
    import { rasterize } from './src/geo/rasterize.js'
    import { outlinesForLevel } from './src/geo/outlines.js'
    import stories from './src/content/story-levels.json' with { type: 'json' }
    const preview = stories['G2-SA-S3']
    assert.throws(() => rasterize(preview.region, preview.threshold), /Geography must be loaded/)
    assert.ok(outlinesForLevel(preview).length)
    console.log('Unloaded rasterizer fails; independent presentation succeeds.')
  `], { cwd: root, encoding: 'utf8' })
  assert.match(output, /independent presentation succeeds/)
})

test('pixelated outlines use the same projection as generated maps at every threshold', async () => {
  // A separate worker leaves the unloaded-world assertions isolated.
  const { Worker } = await import('node:worker_threads')
  const world = JSON.parse(gunzipSync(readFileSync(new URL('../src/data/world.geojson.gz', import.meta.url))))
  const worker = new Worker(`
    const { parentPort, workerData } = require('node:worker_threads')
    ;(async () => {
      const { setGeography } = await import(workerData.worldModule)
      const { rasterize } = await import(workerData.rasterModule)
      setGeography(workerData.world)
      const actual = []
      for (const id of Object.keys(workerData.regions)) {
        for (const threshold of [0.12, 0.24, 0.36, 0.48]) {
          const map = rasterize(id, threshold)
          actual.push({ id, threshold, regions: map.regions.map(({ id, path }) => ({ id, path })) })
        }
      }
      parentPort.postMessage(actual)
    })().catch(error => { throw error })
  `, { eval: true, workerData: {
    world, regions: atlas.regions,
    worldModule: new URL('../src/geo/world.js', import.meta.url).href,
    rasterModule: new URL('../src/geo/rasterize.js', import.meta.url).href
  } })
  try {
    const results = await new Promise((resolve, reject) => {
      worker.once('message', resolve)
      worker.once('error', reject)
      worker.once('exit', code => { if (code !== 0) reject(new Error(`Worker exited with ${code}`)) })
    })
    assert.equal(results.length, 32)
    for (const result of results) {
      const map = atlas.regions[result.id]
      const margin = Math.max(map.width, map.height) * 3
      const bounds = [-margin, -margin, map.width + margin, map.height + margin].map(value => value * MAP_TILE_SIZE)
      const pixelated = result.regions.map(({ id, path }) => ({ id, path: mosaicPath(path, bounds) })).filter(region => region.path)
      assert.deepEqual(pixelated, map.regions, `${result.id}:${result.threshold}`)
    }
  } finally {
    await worker.terminate()
  }
  assert.throws(() => getGeography(), /Geography must be loaded/)
})
