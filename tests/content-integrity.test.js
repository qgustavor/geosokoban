import test from 'node:test'
import assert from 'node:assert/strict'
import templates from '../src/content/fallback-levels-v5.json' with { type: 'json' }
import { storyCode, storyIndex, STORY_COUNT } from '../src/content/regions.js'
import { storyLevel } from '../src/content/story.js'
import { toTiled, fromTiled } from '../src/core/tiled.js'
import { generate } from '../src/core/generate.js'
import { prepareLevel } from '../src/core/prepare-level.js'
import { validMoveCertificate } from '../src/core/difficulty.js'
import { assertPlayable } from './support.js'

test('every playable story chapter has a working solution, including after an editor round trip', () => {
  for (let index = 1; index <= STORY_COUNT; index++) {
    const code = storyCode(index)
    const level = storyLevel(code)
    assert.ok(level, code)
    assert.equal(level.id, code)
    assert.equal(storyIndex(code), index)
    assertPlayable(level)
    const imported = fromTiled(toTiled(level))
    assert.equal(imported.id, code)
    assertPlayable(imported, level.solution)
  }
  assert.equal(storyLevel('not-a-chapter'), null)
})

test('shipped fallback templates retain playable solutions and valid move certificates', () => {
  assert.ok(Object.keys(templates).length > 0)
  for (const level of Object.values(templates)) {
    assertPlayable(level)
    assertPlayable(level, level.designSolution)
    assert.equal(validMoveCertificate(level), true, level.id)
  }
})

test('exhausting generation selects a deterministic matching fallback; technical errors still surface', () => {
  const code = 'south-america-calm-bay-10-hard'
  const options = { generator: (input, options) => generate(input, { ...options, attemptLimit: 0 }) }
  const level = prepareLevel(code, options)
  assert.equal(level.id, code)
  assert.equal(level.region, 'SA')
  assert.equal(level.planning, true)
  assertPlayable(level)
  assert.deepEqual(prepareLevel(code, options), level)
  const failure = new Error('Worker transport failed')
  assert.throws(() => prepareLevel(code, {
    generator: () => {
      throw failure
    }
  }), error => error === failure)
})
