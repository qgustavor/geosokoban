import test from 'node:test'
import assert from 'node:assert/strict'
import { createBoardInput } from '../src/core/board-input.js'

function fixture () {
  const moves = []
  const transforms = []
  const input = createBoardInput(direction => moves.push(direction), change => transforms.push(change))
  return { input, moves, transforms }
}

test('a tap still inspects; a one-finger swipe moves and consumes its click', () => {
  const { input, moves, transforms } = fixture()
  input.down(1, 100, 100)
  input.up(1, 103, 100)
  assert.equal(input.consumeClick(), false)
  input.down(1, 100, 100)
  input.up(1, 132, 100)
  assert.deepEqual(moves, ['right'])
  assert.deepEqual(transforms, [])
  assert.equal(input.consumeClick(), true)
  assert.equal(input.active, false)
})

test('pinches and two-finger pans do not move, including the last remaining finger', () => {
  const { input, moves, transforms } = fixture()
  input.down(4, 100, 100)
  input.down(7, 200, 100)
  input.move(4, 80, 100)
  input.move(7, 220, 100)
  assert.ok(transforms.some(change => change.scale > 1))
  input.up(7, 220, 100)
  assert.equal(input.consumeClick(), true)
  input.move(4, 250, 100)
  input.up(4, 250, 100)
  assert.deepEqual(moves, [])
  assert.equal(input.consumeClick(), true)
  input.down(9, 100, 100)
  input.up(9, 100, 132)
  assert.deepEqual(moves, ['down'])
})

test('cancelling or losing capture never adds a release-position move or strands the next swipe', () => {
  for (const multi of [false, true]) {
    const { input, moves } = fixture()
    input.down(1, 100, 100)
    if (multi) input.down(2, 200, 100)
    input.up(1, 0, 0, true)
    if (multi) {
      input.move(2, 300, 100)
      input.up(2, 300, 100, true)
    }
    assert.deepEqual(moves, [])
    input.down(3, 100, 100)
    input.up(3, 68, 100)
    assert.deepEqual(moves, ['left'])
    input.up(3, 999, 999, true)
    assert.deepEqual(moves, ['left'])
  }
})

test('third touches and lifting the primary finger keep the multi-touch latch until all lift', () => {
  const { input, moves, transforms } = fixture()
  input.down(1, 0, 100)
  input.down(2, 100, 100)
  input.down(3, 200, 100)
  input.up(1, 0, 100)
  input.move(3, 220, 100)
  input.up(2, 100, 100)
  input.move(3, 300, 100)
  input.up(3, 300, 100)
  assert.deepEqual(moves, [])
  assert.ok(transforms.length)
  assert.equal(input.active, false)
})

test('blur/reset clears every pointer and coincident touches never produce NaN', () => {
  const { input, moves, transforms } = fixture()
  input.down(1, 100, 100)
  input.down(2, 100, 100)
  input.move(2, 140, 100)
  assert.ok(transforms.every(change => Number.isFinite(change.scale)))
  input.reset()
  input.move(1, 500, 500)
  input.up(2, 500, 500)
  assert.deepEqual(moves, [])
  input.down(1, 100, 100)
  input.up(1, 100, 68)
  assert.deepEqual(moves, ['up'])
})
