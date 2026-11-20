import test from 'node:test'
import assert from 'node:assert/strict'
import { initialState, move, isSolved, replay } from '../src/core/engine.js'
import { Session } from '../src/core/session.js'
import { solve } from '../src/core/solver.js'
import { makeHintPlan, hintOverlay, advanceHintPlan } from '../src/core/hints.js'
import { createHintCooldown } from '../src/core/hint-cooldown.js'
import { corridor } from './support.js'

test('walking and pushing update counts without mutating the starting board', () => {
  const level = corridor()
  const original = structuredClone(level)
  const start = initialState(level)
  assert.strictEqual(move(level, start, 'up'), start)

  const walked = move(level, start, 'right')
  assert.equal(walked.player, 9)
  assert.equal(walked.moves, 1)
  assert.equal(walked.pushes, 0)

  const delivered = move(level, walked, 'right')
  assert.equal(delivered.boxes[0].position, 11)
  assert.equal(delivered.moves, 2)
  assert.equal(delivered.pushes, 1)
  assert.equal(isSolved(level, delivered), true)

  const movedOffGoal = move(level, delivered, 'right')
  assert.equal(isSolved(level, movedOffGoal), false)
  assert.strictEqual(move(level, movedOffGoal, 'right'), movedOffGoal)
  assert.deepEqual(start, initialState(level))
  assert.deepEqual(level, original)
})

test('moves cannot wrap across rows or push two flags at once', () => {
  const edge = { ...corridor(), width: 3, height: 2, floors: [2, 3], player: 2, boxes: [] }
  const edgeState = initialState(edge)
  assert.strictEqual(move(edge, edgeState, 'right'), edgeState)

  const blocked = corridor()
  blocked.boxes.push({ id: 'peru', country: 'PER', position: 11 })
  const state = { ...initialState(blocked), player: 9 }
  assert.strictEqual(move(blocked, state, 'right'), state)
})

test('completion requires the right flag at every destination', () => {
  const level = corridor()
  level.goals = [{ country: 'BRA', position: 11 }, { country: 'PER', position: 12 }]
  const state = {
    ...initialState(level),
    boxes: [{ id: 'brazil', country: 'BRA', position: 12 }, { id: 'peru', country: 'PER', position: 11 }]
  }
  assert.equal(isSolved(level, state), false)
  state.boxes[0].position = 11
  state.boxes[1].position = 12
  assert.equal(isSolved(level, state), true)
})

test('undo restores moves and pushes, including the attempt before a restart', () => {
  const session = new Session(corridor())
  const start = structuredClone(session.state)
  assert.equal(session.step('up'), false)
  assert.equal(session.undo(), false)
  session.step('right')
  const walked = structuredClone(session.state)
  session.step('right')
  const delivered = structuredClone(session.state)

  assert.equal(session.restart(), true)
  assert.deepEqual(session.state, start)
  assert.equal(session.restart(), false)
  assert.equal(session.undo(), true)
  assert.deepEqual(session.state, delivered)
  session.undo()
  assert.deepEqual(session.state, walked)
  session.undo()
  assert.deepEqual(session.state, start)
  assert.equal(session.undo(), false)
})

test('the solver returns playable optima for either supported objective', () => {
  const level = corridor()
  for (const [objective, cost] of [['moves', 2], ['pushes', 1]]) {
    const result = solve(level, initialState(level), 100, { objective })
    assert.equal(result.status, 'solved')
    assert.equal(result.cost, cost)
    const played = replay(level, result.moves)
    assert.equal(played.valid, true)
    assert.equal(isSolved(level, played.state), true)
  }
})

test('running out of search budget is not a proof of impossibility', () => {
  const level = corridor()
  assert.equal(solve(level, initialState(level), 0).status, 'budget-exceeded')
  const trapped = { ...initialState(level), boxes: [{ id: 'brazil', country: 'BRA', position: 12 }] }
  assert.equal(solve(level, trapped).status, 'unsolvable')
})

test('hints reveal a legal route and advance only when that route is followed', () => {
  const level = corridor()
  const start = initialState(level)
  const solution = solve(level, start).moves
  const plan = makeHintPlan(level, start, solution)
  assert.deepEqual(hintOverlay(plan, 1, start), { boxId: 'brazil', pushes: [], route: [] })
  assert.deepEqual(hintOverlay(plan, 3, start), {
    boxId: 'brazil', pushes: [{ country: 'BRA', position: 11 }], route: [8, 9, 10]
  })
  const walked = move(level, start, solution[0])
  const remaining = advanceHintPlan(level, plan, 3, start, walked)
  assert.equal(remaining.complete, false)
  const delivered = move(level, walked, solution[1])
  assert.equal(advanceHintPlan(level, remaining, 3, walked, delivered).complete, true)
  assert.equal(advanceHintPlan(level, remaining, 3, walked, move(level, walked, 'left')), null)
})

test('the first hint is immediate and another request must wait ten seconds', t => {
  let now = 0
  const cooldown = createHintCooldown(() => {}, {
    now: () => now,
    schedule: () => 1,
    clear: () => {}
  })
  t.after(() => cooldown.dispose())
  assert.equal(cooldown.tryStart(), true)
  now = 9999
  assert.equal(cooldown.tryStart(), false)
  now = 10000
  assert.equal(cooldown.tryStart(), true)
  cooldown.dispose()
  now = 20000
  assert.equal(cooldown.tryStart(), false)
})
