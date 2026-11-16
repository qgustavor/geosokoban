import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { boardTransitionDuration, tileTransitionStyle, TILE_ENTER_MS, TILE_LEAVE_MS } from '../src/core/board-transition.js'

test('explicit transition durations cover every tile, and exit reverses the diagonal sweep', () => {
  for (const level of [{ width: 1, height: 1 }, { width: 26, height: 24 }, { width: 5, height: 60 }]) {
    const duration = boardTransitionDuration()
    let previousEnter = -1
    let previousLeave = Infinity
    for (let x = 0; x < level.width; x++) {
      const style = tileTransitionStyle(level, x)
      const enter = parseFloat(style.animationDelay)
      const leave = parseFloat(style['--tile-leave-delay'])
      assert.ok(enter >= previousEnter && leave <= previousLeave)
      previousEnter = enter; previousLeave = leave
    }
    for (let position = 0; position < level.width * level.height; position++) {
      const style = tileTransitionStyle(level, position)
      assert.ok(parseFloat(style.animationDelay) + TILE_ENTER_MS <= duration.enter)
      assert.ok(parseFloat(style['--tile-leave-delay']) + TILE_LEAVE_MS <= duration.leave)
    }
  }
  assert.deepEqual(boardTransitionDuration(true), { enter: 0, leave: 0 })
})

test('the board stays mounted for out-in transitions, with input locks and reduced-motion support', () => {
  const source = file => readFileSync(new URL('../src/' + file, import.meta.url), 'utf8')
  const play = source('ui/PlayView.vue')
  assert.match(play, /<Transition name="board-swap" mode="out-in" appear/)
  assert.match(play, /:duration="transitionDuration"/)
  assert.match(play, /:css="!reducedMotion"/)
  assert.match(play, /:key="game.level.id"/)
  assert.match(play, /:inert="transitioning \|\| undefined"/)
  assert.match(source('pages/PuzzlePage.vue'), /v-if="app.activeCode"/)
  const board = source('ui/GameBoard.vue')
  assert.match(board, /@keyframes tile-build/)
  assert.match(board, /@keyframes tile-dismantle/)
  assert.match(board, /tileDelay\(state.player\)/)
  assert.doesNotMatch(source('ui/App.vue'), /<FlightTransition/)
})
