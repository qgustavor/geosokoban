import { storyIndex, storyStop } from './regions.js'

/** Campaign teaching rules are authored, never inherited from menu difficulty or URL queries. */
export function storyRules (code) {
  const chapter = storyStop(storyIndex(code))
  if (!chapter) return null

  return {
    tour: chapter.tour,
    guidance: chapter.tour === 2 ? 'remember' : 'learn',
    hideTargets: chapter.tour === 2
  }
}
