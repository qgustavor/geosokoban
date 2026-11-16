import test from 'node:test'
import assert from 'node:assert/strict'
import { REGIONS, storyCode } from '../src/content/regions.js'
import { dailyCode, newCode, normalizeCode, parseCode, isPlanningCode } from '../src/core/seed.js'
import { withPlanning } from '../src/core/challenge.js'
import { generate, GenerationExhausted } from '../src/core/generate.js'
import { fallbackLevel } from '../src/core/prepare-level.js'
import { createLevelCache } from '../src/core/level-cache.js'
import { replay, isSolved } from '../src/core/engine.js'

test('new codes use readable tokens and preserve the requested region', () => {
  for (const region of REGIONS) {
    for (let sample = 0; sample < 100; sample++) {
      const code = newCode(region.id)
      assert.match(code, new RegExp(`^${region.slug}-[a-z]+-[a-z]+-[1-9]\\d$`))
      assert.equal(normalizeCode(code), code)
      assert.deepEqual(parseCode(code), { code, region: region.id, planning: false, tour: 0 })
    }
  }
})

test('readable codes accept case, spaces and underscores without changing the board identity', () => {
  for (const input of [' ASIA-CALM-KITE-42 ', 'Asia Calm Kite 42', 'asia_calm_kite_42']) {
    assert.equal(normalizeCode(input), 'asia-calm-kite-42')
  }
  assert.equal(normalizeCode('South America Tour 2 Hard'), 'south-america-tour-2-hard')
})

test('readable date codes reject rolled-over dates and unknown words or regions', () => {
  for (const code of [
    null, {}, '', 'asia-2026-02-29', 'asia-2026-04-31', 'asia-2026-13-01',
    'asia-calm-kite-00', 'asia-calm-kite-100', 'asia-unknown-kite-42',
    'asia-calm-unknown-42', 'mars-calm-kite-42', 'asia-tour-0', 'asia-tour-4',
    'asia-calm-kite-42-hard-hard', '../asia-calm-kite-42', '<script>'
  ]) assert.equal(normalizeCode(code), null, String(code))

  assert.equal(normalizeCode('asia-2024-02-29'), 'asia-2024-02-29')
})

test('hard is an idempotent readable suffix for all new puzzle types', () => {
  for (const code of [newCode(), dailyCode(), storyCode(1)]) {
    const hard = withPlanning(code, true)
    assert.equal(hard, code + '-hard')
    assert.equal(withPlanning(hard, true), hard)
    assert.equal(withPlanning(hard, false), code)
    assert.equal(isPlanningCode(hard), true)
    assert.equal(isPlanningCode(code), false)
    assert.equal(normalizeCode(hard), hard)
  }
})

test('generation parses hyphenated regions without guessing the position of a token', () => {
  for (const region of REGIONS.filter(region => region.id !== 'NA')) {
    const code = `${region.slug}-calm-kite-42-hard`
    assert.throws(() => generate(code, { attemptLimit: 0, solverBudget: 0 }), error => {
      assert.ok(error instanceof GenerationExhausted)
      assert.equal(error.region, region.id)
      assert.equal(error.code, code)
      assert.equal(error.planning, true)
      return true
    })
  }
})

test('readable fallback codes replay, cache and reproduce in every region and difficulty', () => {
  const cache = createLevelCache({ storage: () => null })

  for (const region of REGIONS) {
    for (const planning of [false, true]) {
      const code = withPlanning(`${region.slug}-calm-kite-42`, planning)
      const request = { code, region: region.id, planning }
      const level = fallbackLevel(request)
      const checked = replay(level, level.solution)
      assert.equal(checked.valid && isSolved(level, checked.state), true, code)
      assert.deepEqual(fallbackLevel(request), level, code)
      cache.set(level)
      assert.deepEqual(cache.get(code), level, code)
    }
  }
})
