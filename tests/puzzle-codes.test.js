import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeCode, parseCode, newCode, dailyCode, puzzleDate } from '../src/core/seed.js'
import { withPlanning, challengeSettings } from '../src/core/challenge.js'
import { puzzleLocation, guardedPuzzleLocation } from '../src/router/locations.js'
import { REGIONS } from '../src/content/regions.js'

test('current date, word and tour codes parse; invalid and retired formats do not', () => {
  const cases = [
    ['2024-02-29', '2024-02-29'],
    ['2024-02-29-HARD', '2024-02-29-hard'],
    [' South_America Calm Bay 10 ', 'south-america-calm-bay-10'],
    ['south-america-tour-2', 'south-america-tour-2'],
    ['africa-2024-02-29-hard', 'africa-2024-02-29-hard']
  ]
  for (const [input, expected] of cases) assert.equal(normalizeCode(input), expected)
  for (const input of [null, '', '2025-02-29', 'africa-2024-02-30', 'africa-unknown-word-10',
    'south-america-tour-4', 'G2-SA-S1', 'G2-SA-D20261119-P', 'G2-SA-0000000000']) {
    assert.equal(parseCode(input), null)
  }
  for (const region of REGIONS) {
    const code = newCode(region.id)
    assert.deepEqual(parseCode(code), { code, region: region.id, planning: false, tour: 0 })
  }
  assert.equal(dailyCode(new Date('2026-11-19T22:30:00-03:00')), '2026-11-20')
  assert.equal(puzzleDate('africa-2024-02-29-hard'), '2024-02-29')
  assert.equal(puzzleDate('africa-calm-bay-10'), null)
})

test('difficulty controls guidance and hard layouts, while story stays on its authored route', () => {
  const code = '2026-11-19'
  assert.deepEqual(challengeSettings('medium'), { guidance: 'remember', planning: false })
  assert.deepEqual(challengeSettings('hard'), { guidance: 'remember', planning: true })
  assert.deepEqual(puzzleLocation(code), { name: 'puzzle', params: { code }, query: { g: 'learn' } })
  assert.deepEqual(puzzleLocation(code, 'remember').query, { g: 'remember' })
  const hard = withPlanning(code, true)
  assert.equal(hard, '2026-11-19-hard')
  assert.equal(withPlanning(hard, true), hard)
  assert.equal(withPlanning(hard, false), code)
  assert.deepEqual(puzzleLocation(hard, 'learn').query, { g: 'remember' })
  assert.deepEqual(puzzleLocation('south-america-tour-1-hard', 'remember'), {
    name: 'puzzle', params: { code: 'south-america-tour-1' }, query: {}
  })
})

test('future or invalid puzzle links go home; today and archived days remain playable', () => {
  const today = '2026-11-20'
  for (const code of ['2026-11-21', '2026-11-21-hard', 'africa-2026-11-21-hard', 'not-a-puzzle']) {
    assert.deepEqual(guardedPuzzleLocation(code, 'learn', today), { name: 'home' })
  }
  for (const code of ['2026-11-20', '2026-11-19-hard', 'south-america-tour-1', 'africa-calm-bay-10']) {
    assert.equal(guardedPuzzleLocation(code, 'learn', today).name, 'puzzle')
  }
})
