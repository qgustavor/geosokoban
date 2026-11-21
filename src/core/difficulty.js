import { initialState, replay, isSolved } from './engine.js'
import { solve } from './solver.js'

export const MINIMUM_EXTRA_MOVES = 5

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

  return {
    status: extraMoves >= minimum ? 'accepted' : 'too-small',
    solution: constrained.moves,
    expanded
  }
}
