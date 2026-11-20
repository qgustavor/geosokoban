import { storyProgressCode } from '../content/story.js'
import { restoreStoryRun } from '../core/run.js'
import { CHALLENGES, challengeSettings } from '../core/challenge.js'
import { audioSettings } from '../audio/settings.js'

const KEY = 'geosokoban.prototype.v2'

export function readPreferences () {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) ?? '{}')

    // Stored preferences are untrusted. Only current story codes count as completed stops.
    // Keep the first occurrence order while removing duplicates.
    const locale = ['en', 'pt-BR', 'es'].includes(data?.locale) ? data.locale : null
    const completed = Array.isArray(data?.completed)
      ? [...new Set(data.completed.map(storyProgressCode).filter(Boolean))]
      : []

    const challenge = CHALLENGES.includes(data?.challenge) ? data.challenge : 'easy'

    return {
      ...audioSettings(data),
      mode: ['story', 'daily', 'archive'].includes(data?.mode) ? data.mode : 'daily',
      challenge,
      locale,
      completed,
      pendingStory: storyProgressCode(data?.pendingStory),
      speedrun: data?.speedrun === true,
      storyRun: restoreStoryRun(data?.storyRun),
      reduced: data?.reduced === true,
      ...challengeSettings(challenge)
    }
  } catch {
    // Invalid JSON and unavailable storage must not prevent a new session from starting.
    return {
      ...audioSettings(),
      mode: 'daily',
      challenge: 'easy',
      locale: null,
      completed: [],
      pendingStory: '',
      speedrun: false,
      storyRun: null,
      reduced: false,
      guidance: 'learn',
      planning: false
    }
  }
}

export function savePreferences (data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    // Saving preferences is best-effort; private browsing or quota limits must not interrupt play.
  }
}
