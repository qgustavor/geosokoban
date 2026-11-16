import { normalizeCode, isPlanningCode } from '../core/seed.js'

export function puzzleLocation (input, guidance = 'learn') {
  const code = normalizeCode(input)

  if (!code) throw new Error('Invalid puzzle code')

  // Hard puzzles always hide targets; other boards use the requested guidance without changing their code.
  const hideTargets = isPlanningCode(code) || guidance === 'remember'
  const targetGuidance = hideTargets ? 'remember' : 'learn'

  return {
    name: 'puzzle',
    params: { code },
    query: { g: targetGuidance }
  }
}
