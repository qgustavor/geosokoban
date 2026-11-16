import test from 'node:test'
import assert from 'node:assert/strict'
import frozen from '../src/content/fallback-levels-v4.json' with { type: 'json' }
import { createLevelCache, LEVEL_CACHE_KEY, LEVEL_CACHE_VERSION } from '../src/core/level-cache.js'
import { GENERATOR_VERSION } from '../src/core/generation-version.js'

const source = Object.values(frozen).find(level => level.region === 'SA' && !level.planning)
const fixture = (index = 0) => ({ ...structuredClone(source), id: `G2-SA-${String(index).padStart(10, '0')}`, generatorVersion: GENERATOR_VERSION })
function storage () {
  const values = new Map()
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }
}

test('generated levels survive a new cache instance without sharing mutable data', () => {
  const disk = storage()
  const cache = createLevelCache({ storage: () => disk })
  const level = fixture()
  assert.equal(cache.set(level), true)
  level.boxes[0].position = -1
  const restored = newCache().get(fixture().id)
  assert.notEqual(restored.boxes[0].position, -1)
  restored.solution.length = 0
  assert.ok(cache.get(fixture().id).solution.length)
  assert.ok(cache.get(` ${fixture().id.toLowerCase()} `))
  function newCache () {
    return createLevelCache({ storage: () => disk })
  }
})

test('LRU capacity evicts the least recently read level, not the newest', () => {
  const cache = createLevelCache({ storage: () => null, maxEntries: 2 })
  cache.set(fixture(0)); cache.set(fixture(1)); cache.get(fixture(0).id); cache.set(fixture(2))
  assert.equal(cache.size, 2)
  assert.equal(cache.get(fixture(1).id), null)
  assert.ok(cache.get(fixture(0).id))
  assert.ok(cache.get(fixture(2).id))
  cache.clear()
  assert.equal(cache.size, 0)
})

test('corrupt, obsolete and mismatched persisted entries are misses', () => {
  for (const saved of [
    '{broken',
    JSON.stringify({ version: 'old', entries: [[fixture().id, fixture()]] }),
    JSON.stringify({ version: LEVEL_CACHE_VERSION, entries: [[fixture().id, { ...fixture(), id: fixture(1).id }]] }),
    JSON.stringify({ version: LEVEL_CACHE_VERSION, entries: [[fixture().id, { ...fixture(), solution: ['invalid'] }]] }),
    JSON.stringify({ version: LEVEL_CACHE_VERSION, entries: [[fixture().id, { ...fixture(), region: 'OC' }]] })
  ]) {
    const disk = storage()
    disk.setItem(LEVEL_CACHE_KEY, saved)
    assert.equal(createLevelCache({ storage: () => disk }).get(fixture().id), null)
  }
})

test('unavailable storage, quota failures and oversized persistence retain a working memory cache', () => {
  for (const options of [
    {
      storage: () => {
        throw new Error('SecurityError')
      }
    },
    {
      storage: () => ({
        getItem: () => null,
        setItem: () => {
          throw new Error('QuotaExceededError')
        },
        removeItem: () => {}
      })
    },
    { storage, maxCharacters: 1 }
  ]) {
    const cache = createLevelCache(options)
    assert.equal(cache.set(fixture()), true)
    assert.ok(cache.get(fixture().id))
    assert.doesNotThrow(() => cache.clear())
  }
})

test('invalid certificates and old generator versions are never cached', () => {
  const cache = createLevelCache({ storage: () => null })
  for (const level of [null, {}, { ...fixture(), generatorVersion: GENERATOR_VERSION - 1 }, { ...fixture(), planning: true }, { ...fixture(), moveCertificate: null }]) {
    assert.equal(cache.set(level), false)
  }
  assert.equal(cache.get('invalid'), null)
  assert.throws(() => createLevelCache({ maxEntries: 0 }), RangeError)
})
