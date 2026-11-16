import { initialState, replay, isSolved } from './engine.js'
import { solve } from './solver.js'

export const MINIMUM_EXTRA_MOVES = 5
export const MOVE_CERTIFICATE_VERSION = 1

/** Compare walking plus pushes; retain coasts, islands, boxes, targets and start. */
export function certifyMoveGap (level, {
  minimum = MINIMUM_EXTRA_MOVES,
  maxStates = 40000
} = {}) {
  if (!Number.isSafeInteger(minimum) || minimum < 0) throw new RangeError('Invalid minimum move gap')

  // Remove only placed barriers: changing coastlines or actors would measure a different puzzle.
  const relaxed = { ...level, obstacles: [] }

  // Both searches count walking and pushes, so the gap isolates the barriers' contribution to total moves.
  const baseline = solve(relaxed, initialState(relaxed), maxStates, { objective: 'moves' })

  // An unfinished search cannot establish an optimum and therefore cannot certify a move gap.
  if (baseline.status !== 'solved') {
    return { status: 'uncertified', reason: 'baseline-' + baseline.status, expanded: baseline.expanded }
  }

  const constrained = solve(level, initialState(level), maxStates, { objective: 'moves' })
  const expanded = baseline.expanded + constrained.expanded
  if (constrained.status !== 'solved') {
    return { status: 'uncertified', reason: 'constrained-' + constrained.status, expanded }
  }

  const baselineReplay = replay(relaxed, baseline.moves)
  const constrainedReplay = replay(level, constrained.moves)
  const replaysAreValid = baselineReplay.valid && constrainedReplay.valid
  const hasVerifiedSolutions = replaysAreValid &&
    isSolved(relaxed, baselineReplay.state) &&
    isSolved(level, constrainedReplay.state)

  if (!hasVerifiedSolutions) {
    throw new Error('Invalid move-optimal solution certificate')
  }

  const extraMoves = constrained.cost - baseline.cost

  // Every constrained solution is legal without the barriers, so the relaxed optimum cannot be worse.
  if (extraMoves < 0) throw new Error('Removing obstacles cannot increase the optimal move count')

  const certificate = {
    version: MOVE_CERTIFICATE_VERSION,
    objective: 'moves',
    baseline: 'same-floors-without-obstacles',
    minimum,
    optimalMoves: constrained.cost,
    obstacleFreeMoves: baseline.cost,
    extraMoves,
    baselineSolution: baseline.moves,
    solution: constrained.moves
  }

  return { status: extraMoves >= minimum ? 'accepted' : 'too-small', certificate, expanded }
}

/** Frozen certificates are checked against their accompanying replayable paths. */
export function validMoveCertificate (level, minimum = MINIMUM_EXTRA_MOVES) {
  const certificate = level.moveCertificate
  if (!certificate) return false

  const supportedFormat = certificate.version === MOVE_CERTIFICATE_VERSION &&
    certificate.objective === 'moves' &&
    certificate.baseline === 'same-floors-without-obstacles'
  if (!supportedFormat) return false

  const moveCounts = [
    certificate.optimalMoves,
    certificate.obstacleFreeMoves,
    certificate.extraMoves,
    certificate.minimum
  ]
  if (!moveCounts.every(Number.isSafeInteger)) return false
  if (!Array.isArray(certificate.solution) || !Array.isArray(certificate.baselineSolution)) return false

  const pathsMatchCounts = certificate.optimalMoves === certificate.solution.length &&
    certificate.obstacleFreeMoves === certificate.baselineSolution.length
  if (!pathsMatchCounts) return false

  const recordedGapMatches = certificate.extraMoves === certificate.optimalMoves - certificate.obstacleFreeMoves

  // Apply the caller's current minimum, not the policy recorded when the certificate was created.
  if (!recordedGapMatches || certificate.extraMoves < minimum) return false

  // Runtime validation checks consistency and legal solutions; it does not rerun the optimality searches.
  const constrained = replay(level, certificate.solution)
  const relaxed = { ...level, obstacles: [] }
  const baseline = replay(relaxed, certificate.baselineSolution)

  return constrained.valid && baseline.valid && isSolved(level, constrained.state) && isSolved(relaxed, baseline.state)
}
