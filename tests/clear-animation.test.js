import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import messages from '../src/data/messages.json' with { type: 'json' }
import { clearLetterWords, CLEAR_LETTER_POP_MS, CLEAR_LETTER_SWEEP_MS, CLEAR_FADE_MS } from '../src/core/clear-animation.js'
import { CLEAR_BANNER_MS } from '../src/core/completion.js'

test('every translation pops letter by letter, finishes its stagger and leaves reading time', () => {
  for (const { levelClear } of Object.values(messages)) {
    const words = clearLetterWords(levelClear)
    assert.equal(words.map(word => word.map(letter => letter.character).join('')).join(' '), levelClear.toLocaleUpperCase())
    const letters = words.flat()
    assert.equal(letters[0].delay, 0)
    for (let i = 1; i < letters.length; i++) assert.ok(letters[i].delay > letters[i - 1].delay)
    assert.ok(letters.at(-1).delay <= CLEAR_LETTER_SWEEP_MS)
    assert.ok(CLEAR_BANNER_MS - (letters.at(-1).delay + CLEAR_LETTER_POP_MS + CLEAR_FADE_MS) >= 600)
    assert.deepEqual(letters.map(letter => letter.index), letters.map((_, index) => index))
  }
})

test('graphemes stay intact and long messages cannot overrun the banner duration', () => {
  assert.deepEqual(clearLetterWords(''), [])
  assert.deepEqual(clearLetterWords('   '), [])
  assert.equal(clearLetterWords('e\u0301')[0].length, 1)
  assert.equal(clearLetterWords('🏁')[0].length, 1)
  const letters = clearLetterWords('abcdefghijklmnopqrstuvwxyz'.repeat(4)).flat()
  assert.equal(letters.at(-1).delay, CLEAR_LETTER_SWEEP_MS)
})

test('the banner has one accessible announcement, with explicit and system reduced-motion support', () => {
  const component = readFileSync(new URL('../src/ui/LevelClear.vue', import.meta.url), 'utf8')
  assert.match(component, /role="status" aria-live="polite" aria-atomic="true"/)
  assert.match(component, /class="sr-only">\{\{ text \}\}/)
  assert.match(component, /class="clear-title" aria-hidden="true"/)
  assert.match(component, /v-for="letter in word"/)
  assert.match(component, /translateY\(-\.28em\) scale\(1\.24\)/)
  assert.match(component, /scale\(1\.06,\.92\)/)
  assert.match(component, /\.is-still, \.is-still \.clear-letter \{ animation: none; \}/)
  assert.match(component, /prefers-reduced-motion: reduce/)
})
