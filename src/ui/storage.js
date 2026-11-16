import { storyProgressCode } from '../content/story.js'
import { normalizeCode } from '../core/seed.js'

const KEY = 'geosokoban.prototype.v2'

export function readPreferences () {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) ?? '{}')

    // Storage may contain older or edited saves. Only current story codes count as completed stops.
    // Keep the first occurrence order while removing duplicates.
    const locale = ['en', 'pt-BR', 'es'].includes(data?.locale) ? data.locale : null
    const completed = Array.isArray(data?.completed)
      ? [...new Set(data.completed.map(storyProgressCode).filter(Boolean))]
      : []

    return {
      locale,
      completed,
      pendingStory: storyProgressCode(data?.pendingStory) ? normalizeCode(data.pendingStory) : '',
      reduced: data?.reduced === true,
      guidance: data?.guidance === 'remember' ? 'remember' : 'learn',
      planning: data?.planning === true
    }
  } catch {
    // Invalid JSON and unavailable storage must not prevent a new session from starting.
    return { locale: null, completed: [], pendingStory: '', reduced: false, guidance: 'learn', planning: false }
  }
}

export function savePreferences (data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    // Saving preferences is best-effort; private browsing or quota limits must not interrupt play.
  }
}
