import levels from './story-levels.json' with { type: 'json' }
import { storyCode, storyIndex, storyStop, STORY_COUNT } from './regions.js'

/** Reuse the certified boards; readable route names need not be their frozen JSON keys. */
export function storyLevel (code) {
  const chapter = storyStop(storyIndex(code))
  if (!chapter) return null

  const assetKey = `G2-${chapter.region.id}-S${chapter.tour}`
  const level = levels[assetKey]

  return level ? { ...level, id: storyCode(chapter.index) } : null
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
