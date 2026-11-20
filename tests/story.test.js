import test from 'node:test'
import assert from 'node:assert/strict'
import { storyCode, STORY_COUNT } from '../src/content/regions.js'
import { storyLevel } from '../src/content/story.js'
import { storyRules } from '../src/content/story-rules.js'
import { getStoryScene } from '../src/content/story-dialogue.js'
import { storyCountryGuide, countryCulture } from '../src/content/story-guide.js'
import { storyStage, createStoryPlayback } from '../src/core/story-playback.js'
import { visibleGoals } from '../src/core/presentation.js'
import { initialState, replay } from '../src/core/engine.js'
import { solve, reverseDistances } from '../src/core/solver.js'

// Test the experiences, not copy wording, generated code, SVG markup or exact authored layouts.
test('tour two hides destinations until revealed or delivered; other tours show them', () => {
  for (const tour of [1, 2, 3]) {
    const level = storyLevel(`south-america-tour-${tour}`)
    const rules = storyRules(level.id)
    assert.equal(rules.guidance, tour === 2 ? 'remember' : 'learn')
    const options = { hidden: rules.hideTargets }
    const state = initialState(level)
    assert.equal(visibleGoals(level, state, options).length, tour === 2 ? 0 : level.goals.length)
    if (tour !== 2) continue

    const country = level.goals[0].country
    assert.deepEqual(visibleGoals(level, state, { ...options, revealed: [country] }), [level.goals[0]])
    // A wrong flag does not discover a destination. A matching delivery does.
    state.boxes[1].position = level.goals[0].position
    assert.deepEqual(visibleGoals(level, state, options), [])
    state.boxes[1].position = level.boxes[1].position
    state.boxes[0].position = level.goals[0].position
    assert.deepEqual(visibleGoals(level, state, options), [level.goals[0]])
  }
  assert.equal(storyRules('2024-02-29'), null)
})

test('country lessons follow the actual flags in each localized second and third tour briefing', () => {
  for (const locale of ['en', 'pt-BR', 'es']) {
    for (let index = 1; index <= STORY_COUNT; index++) {
      const code = storyCode(index)
      const before = getStoryScene(code, 'before', locale)
      assert.ok(before?.lines.length, code)
      for (const phase of ['before', 'after']) {
        const scene = getStoryScene(code, phase, locale)
        if (!scene) continue
        for (const line of scene.lines) {
          assert.ok(line.text.trim())
          assert.ok(scene.characters[line.speaker])
        }
      }
      if (storyRules(code).tour === 1) continue
      for (const goal of storyLevel(code).goals) {
        assert.ok(countryCulture(goal.country, locale), goal.country)
        const clue = storyCountryGuide(goal.country, locale)
        assert.ok(before.lines.some(line => line.text === clue), `${code}: ${goal.country}`)
      }
    }
  }
})

test('only the final closing scene reveals Pip; Back restores the magnet and finishing continues once', () => {
  for (let index = 1; index <= STORY_COUNT; index++) {
    for (const phase of ['before', 'after']) {
      const scene = getStoryScene(storyCode(index), phase, 'en')
      if (scene && !(index === STORY_COUNT && phase === 'after')) {
        assert.deepEqual(Object.keys(scene.characters), ['globe'])
      }
    }
  }
  const ending = getStoryScene(storyCode(STORY_COUNT), 'after', 'en')
  assert.ok(ending.characters.pip)
  const removal = ending.lines.findIndex(line => line.stage?.pip === 'settling')
  assert.ok(removal > 0)
  assert.equal(storyStage(ending, removal).pip, 'settling')
  assert.equal(storyStage(ending, removal - 1).pip, 'confused')
  assert.equal(storyStage(ending, ending.lines.length - 1).pip, 'oriented')

  let continued = 0
  let active
  const playback = createStoryPlayback((code, phase) => getStoryScene(code, phase, 'en'), value => {
    active = value
  })
  playback.start(ending.code, 'after', () => {
    continued++
  })
  assert.equal(active.phase, 'after')
  playback.finish()
  playback.finish()
  assert.equal(continued, 1)
  assert.equal(active, null)
})

test('the campaign stays short, teaches real terrain detours, and ends with its greatest pushing challenge', () => {
  let previousPushes = 0
  let earlierMaximum = 0
  let detours = 0
  for (let index = 1; index <= STORY_COUNT; index++) {
    const level = storyLevel(storyCode(index))
    const { tour } = storyRules(level.id)
    const played = replay(level, level.solution)
    // Broad child-friendly budgets, not exact certificates or layout snapshots.
    assert.ok(played.state.moves <= 80, level.id)
    assert.ok(played.state.pushes <= 20, level.id)
    if (index < STORY_COUNT) earlierMaximum = Math.max(earlierMaximum, played.state.pushes)
    if (index <= 3) assert.equal(level.obstacles.length, 0)
    if (tour === 2) assert.ok(level.obstacles.length <= 3)
    if (tour !== 3) continue

    const solved = solve(level, initialState(level), 12000)
    assert.equal(solved.status, 'solved', level.id)
    assert.ok(solved.cost > previousPushes, level.id)
    previousPushes = solved.cost
    for (const goal of level.goals) {
      const box = level.boxes.find(box => box.country === goal.country)
      const withTerrain = reverseDistances(level, goal).get(box.position)
      const withoutTerrain = reverseDistances({ ...level, obstacles: [] }, goal).get(box.position)
      if (withTerrain > withoutTerrain) detours++
    }
    if (index === STORY_COUNT) assert.ok(solved.cost > earlierMaximum)
  }
  assert.ok(detours > 0)
})
