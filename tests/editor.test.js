import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { toTiled, fromTiled } from '../src/core/tiled.js'
import { solve } from '../src/core/solver.js'
import { initialState, replay, isSolved } from '../src/core/engine.js'

const levels = JSON.parse(readFileSync(new URL('../src/content/story-levels.json', import.meta.url)))

test('all 42 story boards round-trip through the Tiled format', () => {
  for (const level of Object.values(levels)) {
    const imported = fromTiled(toTiled(level))
    const preservedFields = [
      'width', 'height', 'region', 'sea', 'player', 'boxes', 'floors', 'obstacles', 'planning', 'cut', 'gates'
    ]

    for (const key of preservedFields) {
      assert.deepEqual(imported[key], level[key], `${level.id}:${key}`)
    }

    assert.equal(isSolved(imported, replay(imported, level.solution).state), true)
  }
})

test('edited boards require a valid player, visible targets and grid-aligned objects', () => {
  let map = toTiled(levels['G2-SA-S1'])
  map.layers.find(layer => layer.name === 'player').objects[0].x += 1
  assert.throws(() => fromTiled(map), /align/)
  map = toTiled(levels['G2-SA-S1'])
  map.layers.find(layer => layer.name === 'player').objects = []
  assert.throws(() => fromTiled(map), /exactly one/)
  map = toTiled(levels['G2-SA-S1'])
  const flag = map.layers.find(layer => layer.name === 'flags').objects[0]
  const target = map.layers.find(layer => layer.name === 'targets').objects[0]
  flag.x = target.x
  flag.y = target.y
  assert.throws(() => fromTiled(map), /Covered starting goal/)
})

test('an imported story layout is independently solvable', () => {
  const level = fromTiled(toTiled(levels['G2-OC-S3']))
  assert.equal(solve(level, initialState(level)).status, 'solved')
})
