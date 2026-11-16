import { STORY_COUNT, storyCode } from '../content/regions.js'

const KEY = 'geosokoban.prototype.v2'
const validCodes = new Set(Array.from({ length: STORY_COUNT }, (_, index) => storyCode(index + 1)))

export function readPreferences () {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) ?? '{}')

    // Storage may contain older or edited saves. Only current story codes count as completed stops.
    // Keep the first occurrence order while removing duplicates.
    const locale = ['en', 'pt-BR', 'es'].includes(data?.locale) ? data.locale : null
    const completed = Array.isArray(data?.completed)
      ? [...new Set(data.completed.filter(code => validCodes.has(code)))]
      : []

    return {
      locale,
      completed,
      reduced: data?.reduced === true,
      guidance: data?.guidance === 'remember' ? 'remember' : 'learn',
      planning: data?.planning === true
    }
  } catch {
    // Invalid JSON and unavailable storage must not prevent a new session from starting.
    return { locale: null, completed: [], reduced: false, guidance: 'learn', planning: false }
  }
}

export function savePreferences (data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    // Saving preferences is best-effort; private browsing or quota limits must not interrupt play.
  }
}
