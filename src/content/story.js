import levels from './story-levels.json' with { type: 'json' }
import { storyCode, storyIndex, STORY_COUNT } from './regions.js'

export function storyLevel (code) {
  return storyIndex(code) ? levels[code] ?? null : null
}

export function resumeStory (completed, pending = '') {
  // A solved board may still have unread dialogue, including the final scene.
  if (storyIndex(pending)) return pending

  const finished = new Set(completed)
  for (let index = 1; index <= STORY_COUNT; index++) {
    const code = storyCode(index)
    if (!finished.has(code)) return code
  }

  return storyCode(1)
}
