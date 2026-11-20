import test from 'node:test'
import assert from 'node:assert/strict'
import { readPreferences, savePreferences } from '../src/ui/storage.js'
import { resumeStory } from '../src/content/story.js'
import { storyCode, STORY_COUNT } from '../src/content/regions.js'
import { createRun, finishRunLevel, elapsedRun, runTotals, restoreStoryRun } from '../src/core/run.js'
import { createLevelCache, LEVEL_CACHE_KEY } from '../src/core/level-cache.js'
import { fallbackLevel } from '../src/core/prepare-level.js'
import { memoryStorage } from './support.js'

function useStorage (t, storage) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage })
  t.after(() => {
    if (original) Object.defineProperty(globalThis, 'localStorage', original)
    else delete globalThis.localStorage
  })
}

test('current preferences round-trip without reconstructing difficulty from obsolete fields', t => {
  useStorage(t, memoryStorage())
  const preferences = {
    mode: 'archive', challenge: 'hard', locale: 'pt-BR', completed: [storyCode(1)],
    pendingStory: storyCode(1), speedrun: true, reduced: true, music: true, sfx: false,
    musicVolume: 20, sfxVolume: 50
  }
  savePreferences(preferences)
  assert.deepEqual(readPreferences(), { ...preferences, storyRun: null, guidance: 'remember', planning: true })
  savePreferences({ guidance: 'remember', planning: true })
  const current = readPreferences()
  assert.equal(current.challenge, 'easy')
  assert.equal(current.guidance, 'learn')
  assert.equal(current.planning, false)
})

test('invalid or unavailable storage does not prevent starting or saving a session', t => {
  const storage = memoryStorage()
  useStorage(t, storage)
  savePreferences({ locale: 'invalid', completed: [storyCode(1), storyCode(1), 'missing'], musicVolume: -1 })
  assert.deepEqual(readPreferences().completed, [storyCode(1)])
  assert.equal(readPreferences().locale, null)
  assert.equal(readPreferences().musicVolume, 0)

  t.mock.method(storage, 'getItem', () => '{')
  assert.equal(readPreferences().challenge, 'easy')
  t.mock.method(storage, 'getItem', () => {
    throw new Error('Storage disabled')
  })
  t.mock.method(storage, 'setItem', () => {
    throw new Error('Storage disabled')
  })
  assert.deepEqual(readPreferences().completed, [])
  assert.doesNotThrow(() => savePreferences({}))
})

test('story resumption honors unread dialogue and restores elapsed time and aggregate results', () => {
  assert.equal(resumeStory([storyCode(1)]), storyCode(2))
  assert.equal(resumeStory([storyCode(1)], storyCode(1)), storyCode(1))

  let run = createRun(storyCode(1), true, 1000)
  run = finishRunLevel(run, storyCode(1), { moves: 4, pushes: 1 }, false, 2000)
  const restored = restoreStoryRun(JSON.parse(JSON.stringify(run)))
  assert.deepEqual(restored, run)
  assert.equal(elapsedRun(restored, 6000), 5000)
  run = restored
  for (let index = 2; index <= STORY_COUNT; index++) {
    run = finishRunLevel(run, storyCode(index), { moves: 10, pushes: 3 }, true, 6000 + index * 1000)
  }
  assert.equal(elapsedRun(run, 60000), 5000 + STORY_COUNT * 1000)
  assert.deepEqual(runTotals(run), {
    levels: STORY_COUNT, moves: 4 + 10 * (STORY_COUNT - 1), pushes: 1 + 3 * (STORY_COUNT - 1), assisted: true
  })
  assert.equal(elapsedRun(createRun(storyCode(2), true, 1000), 6000), null)
})

test('cached boards are isolated from mutations and corrupt persisted solutions are rejected', () => {
  const storage = memoryStorage()
  const code = 'south-america-calm-bay-10'
  const level = fallbackLevel({ code, region: 'SA', planning: false })
  const original = structuredClone(level)
  const cache = createLevelCache({ storage: () => storage })
  assert.equal(cache.set(level), true)
  level.boxes[0].position = -1
  assert.deepEqual(cache.get(code), original)
  const copy = cache.get(code)
  copy.solution.length = 0
  assert.deepEqual(cache.get(code), original)
  assert.deepEqual(createLevelCache({ storage: () => storage }).get(code), original)

  const saved = JSON.parse(storage.getItem(LEVEL_CACHE_KEY))
  saved.entries[0][1].solution = []
  storage.setItem(LEVEL_CACHE_KEY, JSON.stringify(saved))
  assert.equal(createLevelCache({ storage: () => storage }).get(code), null)
})
