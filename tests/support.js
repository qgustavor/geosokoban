import assert from 'node:assert/strict'
import { isSolved, replay, validateLevel } from '../src/core/engine.js'

// A walk followed by one push solves this board; a further push undoes the delivery.
export function corridor () {
  return {
    width: 7,
    height: 3,
    floors: [8, 9, 10, 11, 12],
    obstacles: [],
    player: 8,
    boxes: [{ id: 'brazil', country: 'BRA', position: 10 }],
    goals: [{ country: 'BRA', position: 11 }]
  }
}

export function assertPlayable (level, solution = level.solution) {
  assert.deepEqual(validateLevel(level), [], level.id)
  const result = replay(level, solution)
  assert.equal(result.valid, true, level.id)
  assert.equal(isSolved(level, result.state), true, level.id)
}

export function memoryStorage () {
  const entries = new Map()
  return {
    getItem: key => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, String(value)),
    removeItem: key => entries.delete(key)
  }
}
