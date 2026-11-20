import test from 'node:test'
import assert from 'node:assert/strict'
import { utcDay, shiftDay, isAvailableDay, isCalendarDay } from '../src/core/dates.js'
import { dailyCode, parseCode, puzzleDate } from '../src/core/seed.js'
import { guardedPuzzleLocation } from '../src/router/locations.js'
import { createRun, finishRunLevel, reopenRunLevel, elapsedRun, formatElapsed, runTotals, restoreStoryRun } from '../src/core/run.js'
import { storyCode, STORY_COUNT } from '../src/content/regions.js'
import { messages, translate } from '../src/data/i18n.js'

const today = '2026-11-19'

test('daily and archive use canonical UTC date seeds with real calendar validation', () => {
  assert.equal(dailyCode(new Date('2026-11-19T21:00:00-03:00')), '2026-11-20')
  assert.equal(utcDay(new Date('2026-11-19T20:59:59-03:00')), today)
  assert.equal(shiftDay('2024-03-01', -1), '2024-02-29')
  assert.equal(shiftDay('2026-12-31', 1), '2027-01-01')
  for (const value of ['', '2026-02-29', '2026-04-31', '2026-13-01', '2026-1-1', null]) {
    assert.equal(isCalendarDay(value), false)
  }
  assert.equal(parseCode(today).region, parseCode(today + '-hard').region)
  assert.equal(puzzleDate(today + '-hard'), today)
})

test('future routes return straight to the menu, including forced hard/date fixtures', () => {
  assert.equal(isAvailableDay(today, today), true)
  for (const code of ['2026-11-20', '2026-11-20-hard', 'asia-2026-11-20', 'G2-AS-D20261120-P', 'nonsense']) {
    assert.deepEqual(guardedPuzzleLocation(code, 'learn', today), { name: 'home' })
  }
  assert.equal(guardedPuzzleLocation(today, 'learn', today).params.code, today)
  assert.deepEqual(guardedPuzzleLocation('south-america-tour-1-hard', 'remember', today), {
    name: 'puzzle', params: { code: storyCode(1) }, query: {}
  })
})

test('an optional puzzle clock freezes at completion and restart/undo never resets its origin', () => {
  const start = createRun(today, true, 1000)
  assert.equal(elapsedRun(start, 121000), 120000)
  const finish = finishRunLevel(start, today, { moves: 15, pushes: 4 }, false, 151000)
  assert.equal(elapsedRun(finish, 999999), 150000)
  const reopened = reopenRunLevel(finish, today)
  assert.equal(elapsedRun(reopened, 201000), 200000)
  assert.equal(runTotals(reopened).levels, 0)
  assert.equal(elapsedRun(createRun(today, false, 1000), 999999), null)
  assert.equal(formatElapsed(3661000), '1:01:01')
  assert.equal(formatElapsed(65000), '1:05')
  assert.equal(elapsedRun(start, 0), 0)
})

test('story has one persistent clock through every level, stopping at the final puzzle not its epilogue', () => {
  let run = createRun(storyCode(1), true, 1000)
  for (let index = 1; index <= STORY_COUNT; index++) {
    run = finishRunLevel(run, storyCode(index), { moves: index, pushes: 1 }, index === 2, index * 10000)
    assert.equal(run.finishedAt, index === STORY_COUNT ? STORY_COUNT * 10000 : null)
    run = restoreStoryRun(JSON.parse(JSON.stringify(run)))
  }
  assert.deepEqual(runTotals(run), { levels: STORY_COUNT, moves: 231, pushes: STORY_COUNT, assisted: true })
  assert.equal(elapsedRun(run, 99999999), 209000)
  assert.equal(elapsedRun(createRun(storyCode(8), true, 1000), 999999), null)
})

test('restoring malformed storage never invents level totals or non-finite timers', () => {
  assert.equal(restoreStoryRun(null), null)
  assert.equal(restoreStoryRun({ kind: 'story', version: 1, code: storyCode(1), levels: [] }), null)
  const run = restoreStoryRun({
    ...createRun(storyCode(1), true, 1000),
    levels: {
      [storyCode(1)]: { moves: -1, pushes: 0 },
      [storyCode(2)]: { moves: 10, pushes: 2, assisted: true },
      bad: { moves: 1, pushes: 1 }
    }
  })
  assert.deepEqual(runTotals(run), { levels: 1, moves: 10, pushes: 2, assisted: true })
})

test('all new interface and share strings exist in English, Portuguese and Spanish', () => {
  for (const locale of ['en', 'pt-BR', 'es']) {
    for (const key of ['archive', 'archiveDesc', 'puzzleDate', 'speedrun', 'speedrunDesc', 'mapOverview',
      'followPlayer', 'dailyComplete', 'archiveComplete', 'journeyTotals', 'shareStoryResult', 'gestureHelp']) {
      assert.ok(messages[locale][key], `${locale}:${key}`)
    }
    const text = translate(locale, 'shareDatedResult', { date: today, challenge: 'Medium', moves: 15, help: 'No help' })
    assert.ok(text.includes(today))
    assert.doesNotMatch(text, /\{|\}|seed|G2-/)
  }
})
