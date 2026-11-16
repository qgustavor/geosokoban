import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { boardViewport, diagonalDelay, coastlineEdges, labelPlacement } from '../src/core/presentation.js'
import { createCompletionSequence, DELIVERY_HOLD_MS, CLEAR_BANNER_MS } from '../src/core/completion.js'

function clock () {
  const pending = new Map()
  let count = 0
  let now = 0
  return {
    schedule (callback, ms) { pending.set(++count, { at: now + ms, callback }); return count },
    clear (id) { pending.delete(id) },
    advance (ms) {
      const end = now + ms
      while (true) {
        const next = [...pending].filter(([, value]) => value.at <= end).sort((a, b) => a[1].at - b[1].at)[0]
        if (!next) break
        now = next[1].at
        pending.delete(next[0])
        next[1].callback()
      }
      now = end
    }
  }
}

test('completion keeps the delivered country readable, then announces clear, then opens results', () => {
  const timer = clock()
  const phases = []
  const sequence = createCompletionSequence(phase => phases.push(phase), timer)
  sequence.start()
  assert.equal(phases.at(-1), 'delivery')
  timer.advance(DELIVERY_HOLD_MS - 1)
  assert.equal(phases.at(-1), 'delivery')
  timer.advance(1)
  assert.equal(phases.at(-1), 'clear')
  timer.advance(CLEAR_BANNER_MS)
  assert.equal(phases.at(-1), 'results')
  sequence.reset()
  sequence.start()
  timer.advance(50)
  sequence.reset()
  timer.advance(10000)
  assert.equal(phases.at(-1), 'playing')
})

test('portrait, landscape and ultrawide viewports preserve the entire playable grid with a margin', () => {
  const level = { width: 26, height: 24 }
  for (const size of [{ width: 320, height: 600 }, { width: 1600, height: 700 }, { width: 4000, height: 850 }]) {
    const viewport = boardViewport(level, size)
    assert.ok(viewport.x <= -40)
    assert.ok(viewport.y <= -40)
    assert.ok(viewport.x + viewport.width >= level.width * 40 + 40)
    assert.ok(viewport.y + viewport.height >= level.height * 40 + 40)
    assert.ok(Math.abs(viewport.width / viewport.height - size.width / size.height) < 0.0001)
    const label = labelPlacement(level, 0, viewport, size)
    assert.ok(parseFloat(label.left) >= 10)
    assert.ok(parseFloat(label.top) >= 48)
  }
  assert.equal(diagonalDelay(level, 0), 0)
  assert.equal(diagonalDelay(level, level.width * level.height - 1), 600)
})

test('coast outlines omit internal joins and do not wrap at board edges', () => {
  const level = { width: 3, height: 3, floors: [0, 1, 2, 3, 4, 5, 6, 7, 8] }
  assert.equal(coastlineEdges(level, 4), '')
  assert.equal(coastlineEdges(level, 0).split('M').length - 1, 2)
  assert.equal(coastlineEdges(level, 2).split('M').length - 1, 2)
  const hole = { ...level, floors: level.floors.filter(position => position !== 4) }
  assert.equal(coastlineEdges(hole, 1).split('M').length - 1, 2)
})

test('daily is the default, options are in-place panels and hints have a non-skippable request cooldown', () => {
  const source = name => readFileSync(new URL('../src/' + name, import.meta.url), 'utf8')
  assert.match(source('ui/HomeView.vue'), /const mode = ref\('daily'\)/)
  assert.match(source('ui/App.vue'), /OptionsView v-else-if="app.panel === 'options'" embedded/)
  assert.doesNotMatch(source('ui/HintPanel.vue'), /showNow|skipDelay/i)
  assert.doesNotMatch(source('composables/useAssistance.js'), /skipDelay/)
  assert.match(source('composables/useAssistance.js'), /if \(!cooldown\.tryStart\(\)\) return/)
  assert.match(source('ui/HintPanel.vue'), /help\.cooldownSeconds > 0/)
  assert.match(source('ui/PlayView.vue'), /class="result-title"/)
  assert.match(source('ui/PlayView.vue'), /text-wrap: balance/)
  assert.match(source('ui/GameBoard.vue'), /stroke-opacity: \.12/)
})
