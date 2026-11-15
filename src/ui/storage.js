import { STORY_COUNT, storyCode } from '../content/regions.js'

const KEY = 'geosokoban.prototype.v2'
const validCodes = new Set(Array.from({ length: STORY_COUNT }, (_, index) => storyCode(index + 1)))

export function readPreferences () {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    return {
      locale: ['en', 'pt-BR', 'es'].includes(data?.locale) ? data.locale : null,
      completed: Array.isArray(data?.completed) ? [...new Set(data.completed.filter(code => validCodes.has(code)))] : [],
      reduced: data?.reduced === true,
      guidance: data?.guidance === 'remember' ? 'remember' : 'learn',
      planning: data?.planning === true
    }
  } catch {
    return { locale: null, completed: [], reduced: false, guidance: 'learn', planning: false }
  }
}

export function savePreferences (data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)) } catch {}
}
