import test from 'node:test'
import assert from 'node:assert/strict'
import levels from '../src/content/fallback-levels-v4.json' with { type: 'json' }
import { certifyMoveGap, validMoveCertificate } from '../src/core/difficulty.js'
import { analyzeDesign, meetsDesign } from '../src/core/design-quality.js'

test('all 48 frozen fallbacks reproduce their exact move-optimal gap and structural certificate', () => {
  assert.equal(Object.keys(levels).length, 48)
  const coverage = new Set()
  for (const level of Object.values(levels)) {
    assert.ok(validMoveCertificate(level), level.id)
    const measured = certifyMoveGap(level, { maxStates: 60000 })
    assert.equal(measured.status, 'accepted', level.id)
    assert.equal(measured.certificate.optimalMoves, level.moveCertificate.optimalMoves, level.id)
    assert.equal(measured.certificate.obstacleFreeMoves, level.moveCertificate.obstacleFreeMoves, level.id)
    assert.ok(meetsDesign(analyzeDesign(level, level.designSolution), level.planning), level.id)
    coverage.add(`${level.region}:${level.planning}`)
  }
  assert.equal(coverage.size, 16)
})
