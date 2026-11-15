import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createSwipeInput } from '../src/core/swipe.js'
import { shareResult } from '../src/core/share.js'

const source = path => readFileSync(new URL(path, import.meta.url), 'utf8')

test('swipes ignore taps and other pointers, then move in the dominant direction', () => {
  const moves = []
  const input = createSwipeInput(direction => moves.push(direction))
  input.start(1, 100, 100)
  assert.equal(input.move(2, 200, 100), false)
  assert.equal(input.move(1, 106, 103), false)
  assert.equal(input.move(1, 130, 105), true)
  assert.deepEqual(moves, ['right'])
  assert.equal(input.end(1), true)
  assert.equal(input.move(1, 200, 105), false)
})

test('long drags are bounded and cancellation cannot leave a movement repeat running', () => {
  const moves = []
  const input = createSwipeInput(direction => moves.push(direction))
  input.start(1, 0, 100)
  input.move(1, 0, -1000)
  assert.deepEqual(moves, ['up', 'up', 'up'])
  input.cancel()
  input.move(1, 0, -2000)
  assert.equal(moves.length, 3)
})

test('share uses a visible-dialog fallback on unsupported or rejected native sharing', async () => {
  const data = { title: 'GeoSokoban', text: 'A result', url: 'https://example.test/#/puzzle/test' }
  for (const platform of [{}, { canShare: () => false, share: () => { throw new Error('Not allowed') } }, { share: async () => { throw new Error('Unavailable') } }]) {
    assert.deepEqual(await shareResult(data, platform), { status: 'fallback', text: 'A result\nhttps://example.test/#/puzzle/test' })
  }
  assert.deepEqual(await shareResult(data, { share: async () => {} }), { status: 'shared' })
  assert.deepEqual(await shareResult(data, { share: async () => { throw new DOMException('Cancelled', 'AbortError') } }), { status: 'cancelled' })
})

test('play is an ocean overlay interface, without explanatory captions, sidebar or direction buttons', () => {
  const play = source('../src/ui/PlayView.vue')
  const home = source('../src/ui/HomeView.vue')
  const app = source('../src/ui/App.vue')
  assert.doesNotMatch(play, /play-sidebar|direction-pad|map-caption|schematic|seaCaption|keyboard-note/)
  assert.doesNotMatch(home, /hero-copy|hero-intro|tagline|headline|intro/)
  assert.doesNotMatch(app, /<footer/)
  assert.match(play, /OverlayDialog/)
  assert.match(play, /top-overlay deadlock-warning/)
  assert.match(source('../src/ui/GameBoard.vue'), /class="goal-number">\?<\/text>/)
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
