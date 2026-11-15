import test from 'node:test'
import assert from 'node:assert/strict'
import { DIRECTIONS, initialState, move, isSolved, replay, walkable } from '../src/core/engine.js'
import { solve } from '../src/core/solver.js'
import { randomFrom } from '../src/core/seed.js'
import { certifyMoveGap, MINIMUM_EXTRA_MOVES, validMoveCertificate } from '../src/core/difficulty.js'

// This deliberately expands individual walking steps, independently of push macros.
function bruteForce (level) {
  const floor = walkable(level)
  const key = state => [state.player, ...state.boxes.map(box => box.position)].join(',')
  const start = initialState(level)
  const seen = new Set([key(start)])
  const queue = [start]
  for (let i = 0; i < queue.length; i++) {
    const state = queue[i]
    if (isSolved(level, state)) return state.moves
    for (const direction of DIRECTIONS) {
      const next = move(level, state, direction, floor)
      const signature = key(next)
      if (next !== state && !seen.has(signature)) { seen.add(signature); queue.push(next) }
    }
  }
  return Infinity
}

const rectangle = (width, height) => Array.from({ length: width * height }, (_, i) => i).filter(i => i % width > 0 && i % width < width - 1 && i >= width && i < width * (height - 1))

test('move-optimal A* agrees with independent unit-step BFS on 300 small labelled-box boards', () => {
  const rng = randomFrom('optimality-cases-v1')
  let solved = 0
  for (let index = 0; index < 300; index++) {
    const floors = rectangle(6, 6)
    const shuffled = floors.map(position => ({ position, order: rng() })).sort((a, b) => a.order - b.order).map(item => item.position)
    const level = {
      width: 6,
      height: 6,
      floors,
      obstacles: index % 3 ? shuffled.slice(5, 7) : [],
      player: shuffled[0],
      boxes: [{ id: 'A', country: 'A', position: shuffled[1] }, { id: 'B', country: 'B', position: shuffled[2] }],
      goals: [{ country: 'A', position: shuffled[3] }, { country: 'B', position: shuffled[4] }]
    }
    const expected = bruteForce(level)
    const actual = solve(level, initialState(level), 100000, { objective: 'moves' })
    assert.equal(actual.status, Number.isFinite(expected) ? 'solved' : 'unsolvable', `case ${index}`)
    if (actual.status === 'solved') {
      solved++
      assert.equal(actual.cost, expected, `case ${index}`)
      assert.equal(actual.moves.length, expected)
      assert.equal(actual.optimal, true)
      const checked = replay(level, actual.moves)
      assert.ok(checked.valid && isSolved(level, checked.state))
    }
  }
  assert.ok(solved >= 20, `${solved} solved comparison cases`)
})

test('the move-gap comparison retains coastlines and actors, removes only obstacle objects and rejects trivial boards', () => {
  const level = {
    width: 7,
    height: 5,
    floors: rectangle(7, 5),
    obstacles: [],
    player: 15,
    boxes: [{ id: 'A', country: 'A', position: 16 }],
    goals: [{ country: 'A', position: 18 }]
  }
  const before = structuredClone(level)
  const result = certifyMoveGap(level)
  assert.equal(MINIMUM_EXTRA_MOVES, 5)
  assert.equal(result.status, 'too-small')
  assert.equal(result.certificate.extraMoves, 0)
  assert.equal(result.certificate.optimalMoves, 2)
  assert.equal(result.certificate.obstacleFreeMoves, 2)
  assert.deepEqual(level, before)
  assert.equal(certifyMoveGap(level, { maxStates: 0 }).status, 'uncertified')
  assert.throws(() => certifyMoveGap(level, { minimum: -1 }), RangeError)
  assert.equal(validMoveCertificate(level), false)
})

test('move-optimal search does not collapse player positions to a reachable region', () => {
  const level = {
    width: 7,
    height: 5,
    floors: rectangle(7, 5),
    obstacles: [],
    player: 8,
    boxes: [{ id: 'A', country: 'A', position: 16 }],
    goals: [{ country: 'A', position: 18 }]
  }
  const near = solve(level, { ...initialState(level), player: 15 }, 1000, { objective: 'moves' })
  const far = solve(level, initialState(level), 1000, { objective: 'moves' })
  assert.equal(near.cost, 2)
  assert.equal(far.cost, 3)
  assert.equal(solve(level, initialState(level), 0, { objective: 'moves' }).status, 'budget-exceeded')
  assert.throws(() => solve(level, initialState(level), 1, { objective: 'seconds' }), RangeError)
})

test('five extra total moves are required even when a legal longer solution is already available', () => {
  const level = {
    width: 9,
    height: 7,
    floors: rectangle(9, 7),
    obstacles: [31],
    player: 28,
    boxes: [{ id: 'A', country: 'A', position: 29 }],
    goals: [{ country: 'A', position: 33 }]
  }
  const result = certifyMoveGap(level)
  assert.equal(result.status, 'accepted')
  assert.equal(result.certificate.obstacleFreeMoves, 4)
  assert.equal(result.certificate.optimalMoves, bruteForce(level))
  assert.ok(result.certificate.extraMoves >= 5)
  assert.equal(validMoveCertificate({ ...level, moveCertificate: result.certificate }), true)
  assert.equal(validMoveCertificate({ ...level, moveCertificate: { ...result.certificate, extraMoves: 1000 } }), false)
  assert.equal(certifyMoveGap(level, { minimum: 1000 }).status, 'too-small')
})
