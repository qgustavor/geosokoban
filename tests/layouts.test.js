import test from 'node:test'
import assert from 'node:assert/strict'
import templates from '../src/content/fallback-levels-v5.json' with { type: 'json' }
import { certifyMoveGap, validMoveCertificate } from '../src/core/difficulty.js'
import { analyzeDesign, meetsDesign } from '../src/core/design-quality.js'
import { initialState, isSolved, replay, validateLevel } from '../src/core/engine.js'
import { solve } from '../src/core/solver.js'
import { LAYOUT_FAMILIES } from '../src/core/layout-patterns.js'
import { varyCertifiedLayout, solutionFootprint } from '../src/core/layout-variation.js'
import { generate, GenerationExhausted, GENERATOR_VERSION } from '../src/core/generate.js'

const levels = Object.values(templates)

test('48 varied templates cover every internal region/difficulty with multiple layout families', () => {
  assert.equal(levels.length, 48)
  const coverage = new Map()
  for (const level of levels) {
    assert.equal(level.generatorVersion, GENERATOR_VERSION)
    assert.ok(LAYOUT_FAMILIES.includes(level.motif))
    assert.ok(level.layout.bentPartition)
    assert.ok(level.layout.clusters.length >= 1)
    assert.ok(new Set(level.obstacles.map(position => position % level.width)).size > 1)
    assert.ok(new Set(level.obstacles.map(position => Math.floor(position / level.width))).size > 1)
    const key = `${level.region}:${level.planning}`
    if (!coverage.has(key)) coverage.set(key, [])
    coverage.get(key).push(level.motif)
    assert.deepEqual(validateLevel(level), [], level.id)
    assert.ok(validMoveCertificate(level), level.id)
    assert.ok(meetsDesign(analyzeDesign(level, level.designSolution), level.planning), level.id)
  }
  assert.equal(coverage.size, 16)
  assert.deepEqual(new Set(levels.map(level => level.motif)), new Set(LAYOUT_FAMILIES))
  for (const [key, families] of coverage) {
    assert.equal(families.length, 3, key)
    assert.ok(new Set(families).size >= 2, key)
  }
})

test('every new template independently reproduces its move optimum and push-optimal design solution', () => {
  for (const level of levels) {
    const measured = certifyMoveGap(level, { maxStates: 60000 })
    assert.equal(measured.status, 'accepted', level.id)
    assert.equal(measured.certificate.optimalMoves, level.moveCertificate.optimalMoves, level.id)
    assert.equal(measured.certificate.obstacleFreeMoves, level.moveCertificate.obstacleFreeMoves, level.id)
    const pushes = solve(level, initialState(level), 12000)
    assert.equal(pushes.status, 'solved', level.id)
    assert.equal(pushes.cost, level.quality.pushes, level.id)
  }
})

test('seeded fallback structures preserve both witness paths and the exact move certificate', () => {
  const selected = new Map(levels.map(level => [`${level.region}:${level.planning}`, level]))
  let varied = 0
  for (const level of selected.values()) {
    const code = `G2-${level.region === 'CAR' ? 'NA' : level.region}-9999999999${level.planning ? '-P' : ''}`
    const variant = varyCertifiedLayout(level, code)
    assert.deepEqual(variant, varyCertifiedLayout(level, code))
    assert.deepEqual(variant.moveCertificate, level.moveCertificate)
    const footprint = new Set([...solutionFootprint(level, level.solution), ...solutionFootprint(level, level.designSolution)])
    const added = variant.obstacles.filter(position => !level.obstacles.includes(position))
    if (added.length) varied++
    assert.ok(added.every(position => !footprint.has(position)))
    assert.ok(level.obstacles.every(position => variant.obstacles.includes(position)))
    for (const path of [variant.solution, variant.designSolution]) {
      const result = replay(variant, path)
      assert.ok(result.valid && isSolved(variant, result.state))
    }
    assert.ok(meetsDesign(analyzeDesign(variant, variant.designSolution), variant.planning))
    const measured = certifyMoveGap(variant, { maxStates: 60000 })
    assert.equal(measured.status, 'accepted', code)
    assert.equal(measured.certificate.optimalMoves, level.moveCertificate.optimalMoves)
  }
  assert.ok(varied >= 12, `Only ${varied} of 16 variants added structures`)
})

test('generation budgets are bounded work counts, not wall-clock-dependent cutoffs', () => {
  assert.throws(() => generate('G2-SA-0123456789', { attemptLimit: 0, solverBudget: 0 }), GenerationExhausted)
  assert.throws(() => generate('G2-SA-0123456789', { solverBudget: -1 }), RangeError)
  assert.throws(() => generate('G2-SA-0123456789', { attemptLimit: 1.5 }), RangeError)
})
