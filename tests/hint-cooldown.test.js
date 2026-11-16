import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHintCooldown, HINT_COOLDOWN_MS } from '../src/core/hint-cooldown.js'
import messages from '../src/data/messages.json' with { type: 'json' }

function clock () {
  let time = 0
  let id = 0
  const pending = new Map()
  return {
    now: () => time,
    schedule (callback, delay) {
      pending.set(++id, { at: time + delay, callback }); return id
    },
    clear (key) {
      pending.delete(key)
    },
    get pending () {
      return pending.size
    },
    jump (ms) {
      time += ms
    },
    advance (ms) {
      const target = time + ms
      for (;;) {
        const next = [...pending].filter(([, task]) => task.at <= target).sort((a, b) => a[1].at - b[1].at)[0]
        if (!next) break
        time = Math.max(time, next[1].at)
        pending.delete(next[0])
        next[1].callback()
      }
      time = target
    }
  }
}

test('the first request is immediate; another is rejected through 9,999ms', () => {
  const timer = clock()
  const displayed = []
  const gate = createHintCooldown(value => displayed.push(value), timer)
  assert.equal(HINT_COOLDOWN_MS, 10000)
  assert.equal(timer.pending, 0)
  assert.equal(gate.tryStart(), true)
  assert.equal(displayed.at(-1), 10)
  for (let i = 0; i < 20; i++) assert.equal(gate.tryStart(), false)
  timer.advance(9999)
  assert.equal(displayed.at(-1), 1)
  assert.equal(gate.remainingMilliseconds(), 1)
  assert.equal(gate.tryStart(), false)
  timer.advance(1)
  assert.equal(displayed.at(-1), 0)
  assert.equal(timer.pending, 0)
  assert.equal(gate.tryStart(), true)
  assert.equal(displayed.at(-1), 10)
  gate.dispose()
})

test('each accepted request starts its own full cooldown; rejected requests never extend it', () => {
  const timer = clock()
  const gate = createHintCooldown(() => {}, timer)
  for (let stage = 0; stage < 4; stage++) {
    assert.equal(gate.tryStart(), true)
    timer.advance(5000)
    assert.equal(gate.tryStart(), false)
    assert.equal(gate.remainingMilliseconds(), 5000)
    timer.advance(5000)
  }
  gate.dispose()
})

test('background timer throttling does not grant hints early or add another wait after returning', () => {
  const timer = clock()
  const gate = createHintCooldown(() => {}, timer)
  assert.equal(gate.tryStart(), true)
  timer.jump(9999)
  assert.equal(gate.tryStart(), false)
  timer.jump(60000)
  assert.equal(gate.remainingMilliseconds(), 0)
  assert.equal(gate.tryStart(), true)
  assert.equal(timer.pending, 1)
  assert.equal(gate.remainingMilliseconds(), 10000)
  gate.dispose()
})

test('countdown updates once per second, expires without auto-revealing, and cleans up on disposal', () => {
  const timer = clock()
  const displayed = []
  const gate = createHintCooldown(value => displayed.push(value), timer)
  gate.tryStart()
  timer.advance(10000)
  assert.deepEqual(displayed, [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0])
  timer.advance(60000)
  assert.equal(displayed.length, 11)
  gate.tryStart()
  gate.dispose()
  gate.dispose()
  assert.equal(timer.pending, 0)
  timer.advance(10000)
  assert.equal(displayed.length, 12)
  assert.equal(gate.tryStart(), false)
})

test('fractional clock ticks are rounded up rather than ending the visible cooldown early', () => {
  const timer = clock()
  const displayed = []
  timer.jump(0.5)
  const gate = createHintCooldown(value => displayed.push(value), timer)
  gate.tryStart()
  timer.advance(9999.9)
  assert.equal(gate.tryStart(), false)
  assert.equal(displayed.at(-1), 1)
  timer.advance(0.1)
  assert.equal(displayed.at(-1), 0)
  assert.equal(gate.tryStart(), true)
  gate.dispose()
})

test('the composable guards requests, keeps the timer across overlay resets, and never exposes reveal as a bypass', () => {
  const source = readFileSync(new URL('../src/composables/useAssistance.js', import.meta.url), 'utf8')
  const reset = source.slice(source.indexOf('  function clearHint ()'), source.indexOf('  function cancelCheck ()'))
  assert.doesNotMatch(reset, /cooldown\.(dispose|reset|tryStart)/)
  assert.match(source, /if \(!cooldown\.tryStart\(\)\) return/)
  assert.match(source, /onUnmounted\(\(\) => \{\s+cooldown\.dispose\(\)/)
  assert.doesNotMatch(source.slice(source.lastIndexOf('  return {')), /\breveal\b/)
  for (const dictionary of Object.values(messages)) {
    assert.match(dictionary.hintCooldown, /\{seconds\}/)
    assert.match(dictionary.hintDelaysDescription, /10/)
  }
})
