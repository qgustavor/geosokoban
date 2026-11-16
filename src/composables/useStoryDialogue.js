import { computed, shallowRef } from 'vue'
import { getStoryScene } from '../content/story-dialogue.js'
import { createStoryPlayback } from '../core/story-playback.js'

export function useStoryDialogue (locale) {
  const active = shallowRef(null)
  const resolve = (code, phase) => getStoryScene(code, phase, locale.value)
  const scene = computed(() => {
    if (!active.value) return null

    return resolve(active.value.code, active.value.phase)
  })
  const playback = createStoryPlayback(resolve, value => {
    active.value = value
  })

  return { scene, ...playback }
}
