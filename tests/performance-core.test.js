import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import stories from '../src/content/story-levels.json' with { type: 'json' }
import { setGeography } from '../src/geo/world.js'
import { rasterize } from '../src/geo/rasterize.js'
import { createWalkingSearch } from '../src/core/walking-search.js'
import { initialState, reachable, walkable, move } from '../src/core/engine.js'

const geography = JSON.parse(gunzipSync(readFileSync(new URL('../src/data/world.geojson.gz', import.meta.url))))

test('threshold retries share sampled coverage; changed geography invalidates all raster caches', () => {
  setGeography(geography)
  const first = rasterize('SA', 0.36)
  const retry = rasterize('SA', 0.24)
  assert.equal(first.cells, retry.cells)
  assert.equal(first.regions, retry.regions)
  assert.equal(rasterize('SA', 0.36), first)
  setGeography(structuredClone(geography))
  assert.notEqual(rasterize('SA', 0.36), first)
  assert.deepEqual(rasterize('SA', 0.36), first)
})

test('borrowed walking buffers match the reference BFS and region searches cannot overwrite paths', () => {
  for (const level of Object.values(stories).slice(0, 8)) {
    const search = createWalkingSearch(level, walkable(level), { reuseBuffers: true })
    let state = initialState(level)
    for (const direction of level.solution.slice(0, 12)) {
      const expected = reachable(level, state)
      const paths = search(state)
      const next = move(level, state, direction)
      search(next, false)
      for (const position of level.floors) {
        assert.equal(paths.has(position), expected.has(position))
        assert.deepEqual(paths.pathTo(position), expected.get(position) ?? null)
        assert.equal(paths.distanceTo(position), expected.get(position)?.length ?? null)
      }
      state = next
    }
  }
})

test('default walking search results remain independently owned', () => {
  const level = stories['G2-SA-S2']
  const search = createWalkingSearch(level)
  const start = initialState(level)
  const first = search(start)
  const paths = new Map(level.floors.map(position => [position, first.pathTo(position)]))
  search(move(level, start, level.solution[0]))
  for (const [position, path] of paths) assert.deepEqual(first.pathTo(position), path)
})
