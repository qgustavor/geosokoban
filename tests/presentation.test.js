import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createSwipeInput } from '../src/core/swipe.js'
import { shareResult } from '../src/core/share.js'
import { messages } from '../src/data/i18n.js'

const source = path => readFileSync(new URL(path, import.meta.url), 'utf8')

test('long drags are bounded and cancellation cannot leave a movement repeat running', () => {
  const moves = []
  const input = createSwipeInput(direction => moves.push(direction))
  input.start(1, 0, 100)
  input.move(1, 0, -1000)
  assert.deepEqual(moves, ['up'])
  input.cancel()
  input.move(1, 0, -2000)
  assert.equal(moves.length, 1)
})

test('share uses a visible-dialog fallback on unsupported or rejected native sharing', async () => {
  const data = { title: 'GeoSokoban', text: 'A result', url: 'https://example.test/#/puzzle/test' }
  for (const platform of [{}, {
    canShare: () => false,
    share: () => {
      throw new Error('Not allowed')
    }
  }, {
    share: async () => {
      throw new Error('Unavailable')
    }
  }]) {
    const result = await shareResult(data, platform)
    assert.deepEqual(result, { status: 'fallback', text: 'A result\nhttps://example.test/#/puzzle/test' })
  }
  assert.deepEqual(await shareResult(data, { share: async () => {} }), { status: 'shared' })
  assert.deepEqual(await shareResult(data, {
    share: async () => {
      throw new DOMException('Cancelled', 'AbortError')
    }
  }), { status: 'cancelled' })
})

test('play is an ocean overlay interface, without explanatory captions, sidebar or direction buttons', () => {
  const play = source('../src/ui/PlayView.vue')
  const home = source('../src/ui/HomeView.vue')
  const app = source('../src/ui/App.vue')
  assert.doesNotMatch(play, /play-sidebar|direction-pad|map-caption|schematic|seaCaption|keyboard-note/)
  assert.doesNotMatch(home, /hero-copy|hero-intro|tagline|headline|intro/)
  assert.doesNotMatch(home, /menu-mark|menu-heading|departure-note/)
  assert.match(home, /<h1 class="sr-only">\s*\{\{ t\('home'\) \}\}\s*<\/h1>/)
  assert.doesNotMatch(app, /<footer/)
  assert.match(play, /OverlayDialog/)
  assert.match(play, /top-overlay deadlock-warning/)
  assert.match(source('../src/ui/GameBoard.vue'), /class="goal-number"\s*>\s*\?\s*<\/text>/)
})

test('the globe has directional views, no legs and no step-spin animation', () => {
  const globe = source('../src/ui/GlobeIcon.vue')
  const session = source('../src/composables/useSession.js')
  assert.match(globe, /direction !== 'up'/)
  assert.match(globe, /direction === 'left'/)
  assert.match(globe, /direction === 'right'/)
  assert.doesNotMatch(globe, /globe-land|globe-bob|turn\)/)
  assert.doesNotMatch(session, /360|turn\.value/)
  assert.match(session, /facingHistory\.push/)
})

test('credits describe the campaign rather than asking the player to write its story', () => {
  for (const dictionary of Object.values(messages)) {
    assert.match(dictionary.creditsScope, /21/)
    assert.doesNotMatch(dictionary.creditsScope, /make your own|você criar|para crear/)
    assert.ok(dictionary.sharePuzzle)
  }
})
