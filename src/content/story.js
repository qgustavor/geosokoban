import levels from './story-levels.json' with { type: 'json' }
import { storyCode, storyIndex, STORY_COUNT } from './regions.js'

/** Story play always uses the standard curated board for a chapter. */
export function storyLevel (code) {
  return levels[storyProgressCode(code)] ?? null
}

export function storyProgressCode (code) {
  const index = storyIndex(code)

  return index ? storyCode(index) : ''
}

export function resumeStory (completed, pending = '') {
  // A solved puzzle may still have unread dialogue, including the final reveal.
  // Prefer that checkpoint so closing the tab cannot silently skip the ending.
  const checkpoint = storyProgressCode(pending)
  if (checkpoint) return checkpoint

  const finished = new Set(completed.map(storyProgressCode))

  for (let index = 1; index <= STORY_COUNT; index++) {
    const code = storyCode(index)
    if (!finished.has(code)) return code
  }

  return storyCode(1)
}
