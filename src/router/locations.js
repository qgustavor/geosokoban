import { normalizeCode, isPlanningCode, puzzleDate } from '../core/seed.js'
import { isAvailableDay } from '../core/dates.js'
import { storyIndex, storyCode } from '../content/regions.js'

export function puzzleLocation (input, guidance = 'learn') {
  const code = normalizeCode(input)
  if (!code) throw new Error('Invalid puzzle code')
  const chapter = storyIndex(code)
  if (chapter) return { name: 'puzzle', params: { code: storyCode(chapter) }, query: {} }

  const hideTargets = isPlanningCode(code) || guidance === 'remember'
  return { name: 'puzzle', params: { code }, query: { g: hideTargets ? 'remember' : 'learn' } }
}

/** A small client-side guard, not a security boundary. No error UI for future dates. */
export function guardedPuzzleLocation (input, guidance = 'learn', today) {
  const code = normalizeCode(input)
  const date = puzzleDate(code)
  if (!code || (date && !isAvailableDay(date, today))) return { name: 'home' }
  return puzzleLocation(code, guidance)
}
