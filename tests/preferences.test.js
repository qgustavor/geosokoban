import test from 'node:test'
import assert from 'node:assert/strict'
import { readPreferences, savePreferences } from '../src/ui/storage.js'
import { challengeSettings } from '../src/core/challenge.js'

function storageFixture (initial, check) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  let value = initial
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: () => value,
      setItem: (key, saved) => {
        value = saved
      }
    }
  })
  try {
    check()
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original)
    else delete globalThis.localStorage
  }
}

test('every mode and difficulty persists independently of the current puzzle settings', () => {
  for (const mode of ['story', 'daily', 'archive']) {
    for (const challenge of ['easy', 'medium', 'hard']) {
      storageFixture(null, () => {
        savePreferences({
          ...readPreferences(),
          mode,
          challenge,
          // Story's teaching rules or a linked puzzle must not overwrite the menu choice.
          guidance: 'learn',
          planning: false,
          completed: ['south-america-tour-1']
        })
        const restored = readPreferences()
        assert.equal(restored.mode, mode)
        assert.equal(restored.challenge, challenge)
        assert.equal(restored.guidance, challengeSettings(challenge).guidance)
        assert.equal(restored.planning, challengeSettings(challenge).planning)
        assert.deepEqual(restored.completed, ['south-america-tour-1'])
      })
    }
  }
})

test('old difficulty settings are retained on the first load with the new menu preferences', () => {
  for (const challenge of ['easy', 'medium', 'hard']) {
    storageFixture(JSON.stringify(challengeSettings(challenge)), () => {
      assert.equal(readPreferences().challenge, challenge)
      assert.equal(readPreferences().mode, 'daily')
    })
  }
})

test('invalid or absent preferences use valid defaults without breaking the menu', () => {
  for (const saved of [null, '', '{bad', 'null', '42', '[]', '{"mode":"future","challenge":"impossible"}']) {
    storageFixture(saved, () => {
      assert.equal(readPreferences().mode, 'daily')
      assert.equal(readPreferences().challenge, 'easy')
    })
  }
})

test('blocked local storage does not prevent playing or changing preferences', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get () {
      throw new Error('Storage unavailable')
    }
  })
  try {
    assert.equal(readPreferences().mode, 'daily')
    assert.doesNotThrow(() => savePreferences({ mode: 'story', challenge: 'hard' }))
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original)
    else delete globalThis.localStorage
  }
})
