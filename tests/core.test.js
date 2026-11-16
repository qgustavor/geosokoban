import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { initialState, neighbor, move, isSolved, replay, validateLevel, reachable } from '../src/core/engine.js'
import { Session } from '../src/core/session.js'
import {
  CHALLENGES, challengeName, challengeSettings, withPlanning,
  crossesChallengeGate, challengeDistances, pushLowerBound
} from '../src/core/challenge.js'
import { validMoveCertificate } from '../src/core/difficulty.js'
import { prepareLevel } from '../src/core/prepare-level.js'
import { analyzeDesign, meetsDesign } from '../src/core/design-quality.js'
import { solve, isDefinitelyStuck } from '../src/core/solver.js'
import { dailyCode, normalizeCode, randomFrom, newCode } from '../src/core/seed.js'
import { setGeography } from '../src/geo/world.js'
import { rasterize, countryAt } from '../src/geo/rasterize.js'
import { REGIONS, storyCode, storyIndex } from '../src/content/regions.js'
import { makeHintPlan, hintOverlay, advanceHintPlan } from '../src/core/hints.js'
import { messages, translate, countryName } from '../src/data/i18n.js'

const source = path => readFileSync(new URL(path, import.meta.url), 'utf8')
const world = JSON.parse(gunzipSync(readFileSync(new URL('../src/data/world.geojson.gz', import.meta.url))))
setGeography(world)
const stories = JSON.parse(source('../src/content/story-levels.json'))
const countries = JSON.parse(source('../src/data/countries.json'))

function tiny () {
  return {
    width: 7,
    height: 3,
    floors: [8, 9, 10, 11, 12],
    obstacles: [],
    player: 8,
    boxes: [{ id: 'PER', country: 'PER', position: 10 }],
    goals: [{ country: 'PER', position: 12 }]
  }
}

function assertCertified (level) {
  assert.deepEqual(validateLevel(level), [], level.id)
  assert.equal(isSolved(level, initialState(level)), false, level.id)

  const result = replay(level, level.solution)
  assert.equal(result.valid, true, level.id)
  assert.equal(isSolved(level, result.state), true, level.id)

  const map = rasterize(level.region, level.threshold)
  for (const goal of level.goals) {
    assert.ok(countries[goal.country], goal.country)
    // Geographic placement uses tile centers; sea goals sit offshore near a separate land anchor.
    const x = goal.position % level.width + 0.5
    const y = Math.floor(goal.position / level.width) + 0.5

    if (!level.sea) {
      assert.equal(countryAt(map, x, y), goal.country)
    } else {
      assert.equal(countryAt(map, x, y), null)
      assert.ok(goal.anchor?.length === 2)

      const distanceToAnchor = Math.hypot(x - goal.anchor[0], y - goal.anchor[1])
      assert.ok(distanceToAnchor <= 2.8)
    }
  }
}

test('neighbors never wrap across board edges', () => {
  const edgeSteps = [[6, 'right'], [7, 'left'], [0, 'up'], [20, 'down']]

  for (const [position, direction] of edgeSteps) {
    assert.equal(neighbor(tiny(), position, direction), -1)
  }
})

test('walking, pushing, invalid actions and immutable states', () => {
  const level = tiny()
  const start = initialState(level)
  assert.equal(move(level, start, 'up'), start)
  assert.equal(move(level, start, 'unexpected'), start)
  const next = move(level, start, 'right')
  assert.equal(next.moves, 1)
  assert.equal(next.pushes, 0)
  const push = move(level, next, 'right')
  assert.equal(push.moves, 2)
  assert.equal(push.pushes, 1)
  assert.equal(start.boxes[0].position, 10)
  assert.equal(isSolved(level, move(level, push, 'right')), true)
})

test('chain pushing is forbidden', () => {
  const level = tiny()
  level.player = 9
  level.boxes.push({ id: 'BOL', country: 'BOL', position: 11 })
  const state = initialState(level)
  assert.equal(move(level, state, 'right'), state)
})

test('a flag may cross the wrong destination but cannot complete it', () => {
  const level = tiny()
  level.goals[0].country = 'BOL'
  const result = replay(level, ['right', 'right', 'right'])
  assert.equal(result.valid, true)
  assert.equal(isSolved(level, result.state), false)
})

test('starting targets cannot be covered or overlap', () => {
  const level = tiny()
  assert.deepEqual(validateLevel(level), [])
  level.player = 12
  assert.ok(validateLevel(level).includes('Covered starting goal'))
  level.player = 10
  assert.ok(validateLevel(level).includes('Overlapping actors'))
})

test('walking flood fill respects boxes', () => {
  const positions = [...reachable(tiny(), initialState(tiny())).keys()]
  assert.deepEqual(positions, [8, 9])
})

test('restart resets counts and undo restores the complete pre-restart state', () => {
  const session = new Session(tiny())
  session.step('right')
  session.step('right')
  const before = session.state
  assert.equal(before.moves, 2)
  assert.equal(before.pushes, 1)
  session.restart()
  assert.deepEqual(session.state, initialState(tiny()))
  assert.equal(session.history.length, 3)
  session.undo()
  assert.deepEqual(session.state, before)
  session.undo()
  assert.equal(session.state.moves, 1)
  session.undo()
  assert.deepEqual(session.state, initialState(tiny()))
})

test('blocked movement and a no-op restart do not consume undo entries', () => {
  const session = new Session(tiny())
  assert.equal(session.step('up'), false)
  assert.equal(session.restart(), false)
  assert.equal(session.history.length, 0)
  assert.equal(session.undo(), false)
})

test('50,000 successful walks can all be undone without an artificial cap', () => {
  const session = new Session(tiny())
  for (let index = 0; index < 50000; index++) assert.equal(session.step(index % 2 ? 'left' : 'right'), true)
  assert.equal(session.history.length, 50000)
  assert.equal(session.state.moves, 50000)
  while (session.undo()) {
    // Drain history through the public operation; the restored state is checked below.
  }
  assert.deepEqual(session.state, initialState(tiny()))
})

test('daily codes agree at a UTC boundary in every time zone', () => {
  const before = dailyCode(new Date('2026-11-14T20:59:59-03:00'))
  const after = dailyCode(new Date('2026-11-14T21:00:00-03:00'))
  assert.ok(before.endsWith('D20261114'))
  assert.ok(after.endsWith('D20261115'))
  assert.equal(after, dailyCode(new Date('2026-11-15T09:00:00+09:00')))
})

test('invalid dates, versions, regions and ambiguous codes are rejected', () => {
  assert.equal(normalizeCode(' g2-sa-0123456789 '), 'G2-SA-0123456789')
  const invalidCodes = [
    'G1-SA-S1', 'G2-SA-D20260230', 'G2-SA-S4', '<script>', 'G2-ZZ-S1', 'G2-SA-OOOOOOOOOO', 'G2-SA-'
  ]

  for (const code of invalidCodes) assert.equal(normalizeCode(code), null)
  assert.equal(normalizeCode('G2-SA-D20240229'), 'G2-SA-D20240229')
  for (const region of REGIONS) assert.ok(normalizeCode(newCode(region.id)).startsWith(`G2-${region.id}-`))
})

test('daily rotation includes all seven regions in a 90-day sample', () => {
  const regions = new Set()
  for (let day = 1; day <= 90; day++) regions.add(dailyCode(new Date(Date.UTC(2026, 0, day))).split('-')[1])
  assert.equal(regions.size, 7)
})

test('seeded randomness is reproducible', () => {
  const a = randomFrom('test')
  const b = randomFrom('test')
  assert.deepEqual(Array.from({ length: 100 }, a), Array.from({ length: 100 }, b))
})

test('all translations have matching keys and interpolation parameters', () => {
  const keys = Object.keys(messages.en).sort()
  for (const [locale, dictionary] of Object.entries(messages)) {
    assert.deepEqual(Object.keys(dictionary).sort(), keys, locale)
    for (const key of keys) {
      assert.ok(dictionary[key].length)
      const translatedParameters = (dictionary[key].match(/\{\w+\}/g) ?? []).sort()
      const englishParameters = (messages.en[key].match(/\{\w+\}/g) ?? []).sort()
      assert.deepEqual(translatedParameters, englishParameters)
    }
  }
  assert.equal(translate('es', 'destination', { n: 2 }), 'Destino 2')
})

test('world data and translated country records cover the same features', () => {
  assert.equal(world.features.length, 177)
  for (const feature of world.features) {
    assert.ok(countries[feature.properties.id])
    for (const locale of ['en', 'pt-BR', 'es']) {
      assert.notEqual(countryName(feature.properties.id, locale), feature.properties.id)
    }
  }
})

test('all 42 fixed story boards have visible destinations and certified solutions', () => {
  assert.equal(Object.keys(stories).length, 42)
  for (let index = 1; index <= 21; index++) {
    const code = storyCode(index)
    assert.equal(storyIndex(code), index)
    assert.equal(stories[code].id, code)
    assertCertified(stories[code])
    assertCertified(stories[code + '-P'])
    assert.equal(storyIndex(code + '-P'), index)
  }
})

test('the independent solver solves every story board', () => {
  for (const level of Object.values(stories)) {
    const result = solve(level, initialState(level), 12000)
    assert.equal(result.status, 'solved', level.id)
    const certificate = replay(level, result.moves)
    assert.equal(certificate.valid, true, level.id)
    assert.equal(isSolved(level, certificate.state), true, level.id)
  }
})

const generationSamples = Number(process.env.GENERATION_SAMPLES ?? 3)

test(`${generationSamples * 7} generated easy puzzles are certified, geographically placed and exceed the obstacle-free optimum`, () => {
  for (const region of REGIONS) {
    for (let index = 0; index < generationSamples; index++) {
      const code = `G2-${region.id}-${String(index).padStart(10, '0')}`
      const level = prepareLevel(code)
      assertCertified(level)
      assert.ok(meetsDesign(analyzeDesign(level, level.designSolution), false), level.id)
      assert.ok(validMoveCertificate(level), level.id)
    }
  }
})

test('the same seed produces the same full level', () => {
  for (const region of REGIONS) {
    const code = `G2-${region.id}-0123456789`
    assert.deepEqual(prepareLevel(code), prepareLevel(code))
  }
})

test('search budget exhaustion is not reported as a proven deadlock', () => {
  const level = tiny()
  assert.equal(solve(level, initialState(level), 0).status, 'budget-exceeded')
  const state = initialState(level)
  state.boxes[0].position = 8
  state.player = 9
  assert.equal(solve(level, state).status, 'unsolvable')
  assert.equal(isDefinitelyStuck(level, state), true)
  state.boxes[0].position = 12
  assert.equal(isDefinitelyStuck(level, state), false)
})

test('a deadlock involving two flags is detected without a false static proof', () => {
  const level = {
    width: 8,
    height: 3,
    floors: [9, 10, 11, 12, 13, 14],
    obstacles: [],
    player: 9,
    boxes: [{ id: 'PER', country: 'PER', position: 11 }, { id: 'BOL', country: 'BOL', position: 12 }],
    goals: [{ country: 'PER', position: 13 }, { country: 'BOL', position: 14 }]
  }
  assert.equal(isDefinitelyStuck(level, initialState(level)), false)
  assert.equal(solve(level, initialState(level)).status, 'unsolvable')
})

test('first hint names a box, not the first walking direction', () => {
  const level = tiny()
  const start = initialState(level)
  const plan = makeHintPlan(level, start, ['right', 'right', 'right'])
  assert.equal(plan.firstPush, 1)
  assert.equal(plan.boxId, 'PER')
  assert.equal(plan.pushes, 2)
  assert.deepEqual(hintOverlay(plan, 1, start), { boxId: 'PER', pushes: [], route: [] })
  assert.equal(hintOverlay(plan, 2, start).pushes.length, 2)
  assert.deepEqual(hintOverlay(plan, 3, start).route, [8, 9, 10, 11])
})

test('hint routes advance without requiring another click', () => {
  const level = tiny()
  const start = initialState(level)
  const plan = makeHintPlan(level, start, ['right', 'right', 'right'])
  const next = move(level, start, 'right')
  const advanced = advanceHintPlan(level, plan, 3, start, next)
  assert.equal(advanced.segment.length, 2)
  assert.deepEqual(hintOverlay(advanced, 3, next).route, [9, 10, 11])
  assert.equal(advanceHintPlan(level, advanced, 3, next, move(level, next, 'left')), null)
})

test('all story hint checkpoints replay legally and reach a newly delivered flag', () => {
  for (const level of Object.values(stories)) {
    const start = initialState(level)
    const plan = makeHintPlan(level, start, level.solution)
    assert.ok(plan)
    assert.ok(plan.pushes >= 1 && plan.pushes <= 3)
    assert.ok(plan.delivery.at(-1).delivered)
    assert.equal(replay(level, plan.delivery.map(record => record.direction)).valid, true)
  }
})

test('invalid hint paths are rejected', () => {
  assert.throws(() => makeHintPlan(tiny(), initialState(tiny()), ['up']), /illegal/)
})

test('every Vue component uses script setup and there is no position-check button', () => {
  for (const file of readdirSync(new URL('../src/ui/', import.meta.url)).filter(file => file.endsWith('.vue'))) {
    const content = source(`../src/ui/${file}`)
    assert.match(content, /<script setup>/, file)
    assert.doesNotMatch(content, /<script>/, file)
    assert.doesNotMatch(content, /checkPosition|positionSolvable/, file)
  }
})

test('the production entry point has no standalone build or gameplay timer', () => {
  const pkg = JSON.parse(source('../package.json'))
  assert.equal(pkg.scripts['build:standalone'], undefined)
  assert.equal(pkg.scripts['preview:offline'], undefined)
  assert.ok(pkg.dependencies['flag-icons'])
  assert.doesNotMatch(source('../src/core/session.js'), /Date|performance|setInterval|elapsed|timer/i)
  assert.doesNotMatch(source('../src/ui/PlayView.vue'), /elapsed|checkPosition|gameplayTimer/)
})

test('three difficulty choices match the approved visibility and puzzle settings', () => {
  assert.deepEqual(CHALLENGES, ['easy', 'medium', 'hard'])
  assert.deepEqual(challengeSettings('easy'), { guidance: 'learn', planning: false })
  assert.deepEqual(challengeSettings('medium'), { guidance: 'remember', planning: false })
  assert.deepEqual(challengeSettings('hard'), { guidance: 'remember', planning: true })
  for (const choice of CHALLENGES) {
    const settings = challengeSettings(choice)
    assert.equal(challengeName(settings.guidance, settings.planning), choice)
  }
})

test('puzzle codes preserve the layout challenge and remain unambiguous', () => {
  const code = 'G2-SA-0123456789'
  assert.equal(withPlanning(code, true), code + '-P')
  assert.equal(withPlanning(code + '-P', true), code + '-P')
  assert.equal(withPlanning(code + '-P', false), code)
  assert.equal(normalizeCode(code + '-P'), code + '-P')
  assert.equal(normalizeCode(code + '-P-P'), null)
  assert.equal(normalizeCode('G2-SA-D20261114-P'), 'G2-SA-D20261114-P')
})

function assertChallenge (level) {
  assertCertified(level)
  assert.equal(level.planning, true)
  assert.ok(['trapdoor', 'sliding-door'].includes(level.motif))
  assert.equal(level.gates.length, level.motif === 'trapdoor' ? 1 : 2)
  assert.ok(crossesChallengeGate(level, initialState(level)), level.id)
  const lower = pushLowerBound(challengeDistances(level), initialState(level))
  assert.ok(Number.isFinite(lower) && lower >= 10, level.id)
  const state = replay(level, level.solution).state
  assert.ok(state.pushes >= 10, level.id)
  const coordinate = position => level.cut.axis === 'x' ? position % level.width : Math.floor(position / level.width)
  const cutCells = level.floors.filter(position => coordinate(position) === level.cut.position)
  // Every opening in the partition must be a declared gate; incidental gaps would bypass the challenge.
  const openings = cutCells.filter(position => !level.obstacles.includes(position)).sort((a, b) => a - b)
  const gates = [...level.gates].sort((a, b) => a - b)
  assert.deepEqual(openings, gates, level.id)
}

test('every harder story board contains a necessary gate and a ten-push lower bound', () => {
  const patterns = new Set()
  for (const level of Object.values(stories).filter(level => level.planning)) {
    assertChallenge(level)
    patterns.add(level.motif)
  }
  assert.equal(patterns.size, 2)
})

test(`${generationSamples * 7} generated hard puzzles require parking and pass the move-gap minimum`, () => {
  for (const region of REGIONS) {
    for (let index = 0; index < generationSamples; index++) {
      const level = prepareLevel(`G2-${region.id}-${String(index).padStart(10, '0')}-P`)
      assertCertified(level)
      assert.ok(meetsDesign(analyzeDesign(level, level.designSolution), true), level.id)
      assert.ok(validMoveCertificate(level), level.id)
    }
  }
})

test('harder daily and random puzzles are deterministic', () => {
  for (const region of REGIONS) {
    const code = `G2-${region.id}-0123456789-P`
    assert.deepEqual(prepareLevel(code), prepareLevel(code))
  }
})
