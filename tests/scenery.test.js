import test from 'node:test'
import assert from 'node:assert/strict'
import { createBiomeLookup, sampleRegion } from '../scripts/lib/biome-sampling.js'
import { createScenery } from '../src/scenery/scene.js'
import { paletteForEcoregion, PALETTES } from '../src/scenery/palettes.js'
import { projectionFor } from '../src/geo/projection.js'
import { contextForLevel } from '../src/geo/outlines.js'
import { replay, isSolved } from '../src/core/engine.js'
import stories from '../src/content/story-levels.json' with { type: 'json' }
import { REGIONS, CARIBBEAN } from '../src/content/regions.js'

// Constructed geometry tests lookup behavior; these polygons are not geographic source data.
function feature (id, name, biome, coordinates, type = 'Polygon') {
  return { type: 'Feature', properties: { ECO_ID: id, ECO_NAME: name, BIOME_NUM: biome, REALM: 'test' }, geometry: { type, coordinates } }
}
const ring = (west, south, east, north) => [[west, south], [east, south], [east, north], [west, north], [west, south]]
const collection = features => ({ type: 'FeatureCollection', features })
const fakeAtlas = (level, record, coverage = 1) => ({
  mapVersion: level.mapVersion, ecoregions: { 1: record }, regions: { [level.region]: {
    width: level.width, height: level.height, cells: Array.from({ length: level.width * level.height }, () => [1, null, coverage, 1])
  } }
})

test('biome lookup respects holes and disjoint polygons', () => {
  const lookup = createBiomeLookup(collection([
    feature(1, 'Test A', 1, [ring(0, 0, 10, 10), ring(3, 3, 7, 7)]),
    feature(2, 'Test B', 2, [[ring(11, 0, 13, 2)], [ring(15, 0, 17, 2)]], 'MultiPolygon')
  ]))
  assert.equal(lookup.at(1, 1), 1)
  assert.equal(lookup.at(5, 5), null)
  assert.equal(lookup.at(12, 1), 2)
  assert.equal(lookup.at(16, 1), 2)
  assert.equal(lookup.at(14, 1), null)
})

test('antimeridian polygons do not cover the opposite hemisphere', () => {
  const lookup = createBiomeLookup(collection([feature(7, 'Test Pacific', 1, [[[179, -2], [-179, -2], [-179, 2], [179, 2], [179, -2]]])]))
  assert.equal(lookup.at(179.5, 0), 7)
  assert.equal(lookup.at(-179.5, 0), 7)
  assert.equal(lookup.at(0, 0), null)
})

test('invalid source and missing attributes fail rather than manufacturing biomes', () => {
  for (const data of [null, collection([]), collection([{ properties: {}, geometry: {} }])]) assert.throws(() => createBiomeLookup(data))
})

test('the inverse projection round-trips all eight boards including the Pacific', () => {
  for (const definition of [...REGIONS, CARIBBEAN]) {
    const { project, unproject } = projectionFor(definition)
    for (const point of [[1.5, 1.5], [definition.width / 2, definition.height / 2], [definition.width - 1.5, definition.height - 1.5]]) {
      const result = project(unproject(point))
      assert.ok(Math.abs(result[0] - point[0]) < 1e-10, definition.id)
      assert.ok(Math.abs(result[1] - point[1]) < 1e-10, definition.id)
    }
  }
})

test('grid sampling masks water and records actual classified coverage', () => {
  const definition = { bounds: [0, 0, 4, 4], width: 6, height: 6 }
  const lookup = createBiomeLookup(collection([feature(1, 'Test', 4, [ring(-10, -10, 10, 10)])]))
  assert.ok(sampleRegion(definition, lookup, () => false).cells.every(cell => cell === null))
  assert.ok(sampleRegion(definition, lookup, () => true).cells.every(cell => cell[0] === 1 && cell[2] === 1))
})

test('Caatinga gets its specific art rule, while unrelated dry regions do not get cacti', () => {
  assert.equal(paletteForEcoregion({ name: 'Caatinga', biome: 13 }), 'caatinga')
  assert.equal(paletteForEcoregion({ name: 'Test desert', biome: 13 }), 'arid')
  assert.equal(paletteForEcoregion({ name: 'Test mountain', biome: 10 }), 'montane')
  assert.equal(paletteForEcoregion({ name: 'Rock and Ice', biome: 98 }), 'ice')
  assert.equal(paletteForEcoregion({ name: 'Rock & Ice', biome: 98 }), 'ice')
  assert.ok(PALETTES.caatinga.obstacles.includes('mandacaru'))
  assert.ok(!PALETTES.arid.obstacles.includes('mandacaru'))
  assert.ok(!PALETTES.montane.obstacles.includes('snowRock'))
})

test('unknown or stale biome grids stay neutral', () => {
  const level = stories['G2-SA-S3']
  for (const data of [{}, { ...fakeAtlas(level, { name: 'Caatinga', biome: 13 }), mapVersion: 'stale' }, fakeAtlas(level, { name: 'Caatinga', biome: 13 }, 0.1)]) {
    const scene = createScenery(level, data)
    assert.ok([...scene.tiles.values()].every(tile => tile.palette === 'neutral'))
    assert.ok(scene.obstacles.every(obstacle => obstacle.kind === 'boulder'))
  }
})

test('decoration is deterministic, never occupies targets, and never changes any fixed solution', () => {
  for (const level of Object.values(stories)) {
    const before = JSON.stringify(level)
    const atlas = fakeAtlas(level, { name: 'Test woodland', biome: 4 })
    const first = createScenery(level, atlas)
    assert.deepEqual(createScenery(level, atlas), first)
    assert.equal(first.obstacles.length, level.obstacles.length)
    assert.deepEqual(new Set(first.obstacles.map(obstacle => obstacle.position)), new Set(level.obstacles))
    const excluded = new Set([...level.obstacles, ...level.goals.map(goal => goal.position)])
    assert.ok(first.details.every(detail => !excluded.has(detail.position) && detail.corner >= 0 && detail.corner <= 3))
    const result = replay(level, level.solution)
    assert.ok(result.valid && isSolved(level, result.state), level.id)
    assert.equal(JSON.stringify(level), before)
  }
})

test('boat puzzles use reefs rather than placing trees or cacti on water', () => {
  const level = Object.values(stories).find(level => level.sea)
  const scene = createScenery(level, fakeAtlas(level, { name: 'Caatinga', biome: 13 }))
  assert.ok(scene.obstacles.every(obstacle => obstacle.kind === 'reef'))
  assert.deepEqual(scene.details, [])
})

test('the Western Europe context includes neighboring land outside its country list', () => {
  const level = Object.values(stories).find(level => level.region === 'WE')
  const ids = new Set(contextForLevel(level).map(country => country.id))
  assert.ok(ids.has('POL'))
  assert.ok(ids.has('CZE'))
  assert.ok(ids.has('DZA'))
  assert.ok(ids.has('NOR'))
})
