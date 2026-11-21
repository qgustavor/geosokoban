import test from 'node:test'
import assert from 'node:assert/strict'
import { REGIONS, STORY_COUNT, STORY_TOURS, storyCode, storyIndex, storyStop } from '../src/content/regions.js'
import { storyLevel, storyProgressCode, resumeStory } from '../src/content/story.js'
import { STORY_SCENES, STORY_CHARACTERS, getStoryScene, localizedStoryText } from '../src/content/story-dialogue.js'
import { createStoryPlayback } from '../src/core/story-playback.js'
import { withPlanning } from '../src/core/challenge.js'
import { readPreferences, savePreferences } from '../src/ui/storage.js'
import levels from '../src/content/story-levels.json' with { type: 'json' }

test('each of three tours visits all seven regions before returning to South America', () => {
  assert.equal(STORY_COUNT, 21)
  assert.equal(STORY_TOURS, 3)

  for (let tour = 1; tour <= STORY_TOURS; tour++) {
    const start = (tour - 1) * REGIONS.length
    const stops = REGIONS.map((region, offset) => storyStop(start + offset + 1))
    assert.deepEqual(stops.map(stop => stop.region.id), REGIONS.map(region => region.id))
    assert.ok(stops.every(stop => stop.tour === tour))
  }
  assert.equal(storyCode(7), 'oceania-tour-1')
  assert.equal(storyCode(8), 'south-america-tour-2')
  assert.equal(storyCode(15), 'south-america-tour-3')
})

test('story uses only the authored non-hard boards, including the Caribbean on tour three', () => {
  for (let index = 1; index <= STORY_COUNT; index++) {
    const stop = storyStop(index)
    for (const hard of [false, true]) {
      const code = withPlanning(storyCode(index), hard)
      const key = `G2-${stop.region.id}-S${stop.tour}${hard ? '-P' : ''}`
      assert.equal(storyIndex(code), index)
      assert.equal(storyIndex(key), index)
      assert.deepEqual(storyLevel(code), { ...levels[`G2-${stop.region.id}-S${stop.tour}`], id: storyCode(index) })
      assert.equal(storyProgressCode(code), storyCode(index))
      assert.equal(storyProgressCode(key), storyCode(index))
    }
  }
  assert.equal(storyLevel(storyCode(16)).region, 'CAR')
  assert.equal(storyLevel('asia-calm-kite-42'), null)
})

test('story indices reject missing, malformed and out-of-range chapters', () => {
  for (const value of [0, -1, 22, 1.5, null, undefined, '1']) {
    assert.equal(storyStop(value), null)
    assert.throws(() => storyCode(value), RangeError)
  }
  for (const code of [null, {}, '', 'asia-tour-4', 'asia-tour-1-hard-hard']) assert.equal(storyIndex(code), 0)
})

test('resume prioritizes unread dialogue, even after the final puzzle is completed', () => {
  const codes = Array.from({ length: STORY_COUNT }, (_, index) => storyCode(index + 1))
  assert.equal(resumeStory([]), codes[0])
  assert.equal(resumeStory(codes.slice(0, 7)), codes[7])
  assert.equal(resumeStory(['G2-SA-S1']), codes[1])
  assert.equal(resumeStory(codes), codes[0])
  assert.equal(resumeStory(codes, withPlanning(codes.at(-1), true)), codes.at(-1))
  assert.equal(resumeStory(codes.slice(0, 7), codes[6]), codes[6])
})

test('all before scenes and the ending exist in every supported language', () => {
  for (const locale of ['en', 'pt-BR', 'es']) {
    for (let index = 1; index <= STORY_COUNT; index++) {
      const scene = getStoryScene(storyCode(index), 'before', locale)
      assert.ok(scene.lines.length)
      assert.ok(scene.title && scene.region)
      for (const line of scene.lines) {
        assert.ok(line.text && scene.characters[line.speaker])
        assert.doesNotMatch(line.text, /\{(?:tour|region|stop)\}/)
      }
    }
    const ending = getStoryScene(storyCode(21), 'after', locale)
    assert.deepEqual(Object.keys(ending.characters), ['globe', 'visitor'])
    assert.equal(ending.lines.length, 4)
  }
})

test('authored dialogue has named speakers and matching localized content', () => {
  for (const [slot, phases] of Object.entries(STORY_SCENES)) {
    for (const scene of Object.values(phases)) {
      for (const line of scene.lines) {
        assert.ok(STORY_CHARACTERS[line.speaker], slot)
        for (const locale of ['en', 'pt-BR', 'es']) assert.ok(line.text[locale], slot + ':' + locale)
      }
    }
  }
  assert.equal(localizedStoryText({ en: 'Visit {region}' }, 'fr', { region: 'Asia' }), 'Visit Asia')
  assert.equal(localizedStoryText('Plain text', 'es'), 'Plain text')
  assert.equal(getStoryScene(storyCode(2), 'after', 'en'), null)
  assert.equal(getStoryScene('asia-calm-kite-42', 'before', 'en'), null)
})

test('finishing or skipping a scene invokes its continuation once; cancelling does not', () => {
  let state
  const events = []
  const playback = createStoryPlayback(() => true, value => {
    state = value
  })
  playback.start('first', 'before', () => events.push('first'))
  assert.deepEqual(state, { code: 'first', phase: 'before' })
  playback.finish()
  playback.finish()
  assert.deepEqual(events, ['first'])
  assert.equal(state, null)

  playback.start('stale', 'after', () => events.push('stale'))
  playback.cancel()
  playback.finish()
  assert.deepEqual(events, ['first'])
})

test('replacing a scene discards stale navigation; an absent scene continues immediately', () => {
  const events = []
  const playback = createStoryPlayback(code => code !== 'silent', () => {})
  playback.start('old', 'after', () => events.push('old'))
  playback.start('new', 'before', () => events.push('new'))
  playback.finish()
  playback.start('silent', 'after', () => events.push('silent'))
  playback.finish()
  assert.deepEqual(events, ['new', 'silent'])
})

test('preferences preserve unread ending checkpoints and canonicalize old completed boards', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  let saved = JSON.stringify({
    completed: ['G2-SA-S1', 'south-america-tour-1', 'bad'],
    pendingStory: 'oceania-tour-3-hard'
  })
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: () => saved,
      setItem: (key, value) => {
        saved = value
      }
    }
  })

  try {
    const read = readPreferences()
    assert.deepEqual(read.completed, ['south-america-tour-1'])
    assert.equal(read.pendingStory, 'oceania-tour-3')
    savePreferences(read)
    assert.deepEqual(readPreferences(), read)
    saved = '{invalid'
    assert.equal(readPreferences().pendingStory, '')
    saved = JSON.stringify({ pendingStory: 'asia-calm-kite-42' })
    assert.equal(readPreferences().pendingStory, '')
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor)
    else delete globalThis.localStorage
  }
})
