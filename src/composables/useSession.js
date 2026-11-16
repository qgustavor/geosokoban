import { computed, shallowRef, ref, onUnmounted } from 'vue'
import { Session } from '../core/session.js'
import { isSolved } from '../core/engine.js'
import { loadGeography } from '../geo/world.js'
import storyLevels from '../content/story-levels.json' with { type: 'json' }
import { storyIndex } from '../content/regions.js'
import { createGenerationClient } from '../core/generation-client.js'
import { createLevelCache } from '../core/level-cache.js'
import { createLoadingFeedback, emptyFeedback } from '../core/loading-feedback.js'

export function useSession ({ reducedMotion = () => false } = {}) {
  const level = shallowRef(storyLevels['G2-SA-S1'])
  let session = new Session(level.value)
  const state = shallowRef(session.state)
  const historyCount = ref(0)
  const facing = ref('down')
  let facingHistory = []
  const loading = ref(false)
  const loadingDisplay = shallowRef(emptyFeedback())
  const feedback = createLoadingFeedback(value => {
    loadingDisplay.value = value
  }, { reducedMotion })
  const solved = computed(() => isSolved(level.value, state.value))
  const chapter = computed(() => storyIndex(level.value.id))
  const cache = createLevelCache()
  const generator = createGenerationClient(() => new Worker(new URL('../core/generate.worker.js', import.meta.url), { type: 'module' }))
  let revision = 0
  let cancelRequest = null

  function cancel () {
    revision++
    cancelRequest?.()
    cancelRequest = null
    loading.value = false
    feedback.cancel()
  }

  function update () {
    state.value = session.state
    historyCount.value = session.history.length
  }

  async function start (code) {
    cancel()
    const current = revision
    const cached = storyLevels[code] ?? cache.get(code)
    try {
      let next = cached
      if (!cached) {
        loading.value = true
        feedback.start(code.endsWith('-P'))
        const controller = new AbortController()
        cancelRequest = () => controller.abort()
        const geography = await loadGeography({ signal: controller.signal })
        if (current !== revision) return false
        cancelRequest = generator.cancel
        next = await generator.generate(code, geography, feedback.progress)
        if (current !== revision || !next) return false
        cache.set(next)
        cancelRequest = null
        if (!await feedback.finish()) return false
      }
      if (current !== revision || !next) return false
      session = new Session(next)
      level.value = next
      update()
      facing.value = 'down'
      facingHistory = []
      return true
    } catch (error) {
      if (current !== revision) return false
      throw error
    } finally {
      if (current === revision) {
        cancelRequest = null
        loading.value = false
        feedback.cancel()
      }
    }
  }

  function step (direction) {
    if (loading.value || solved.value || !session.step(direction)) return false
    facingHistory.push(facing.value)
    facing.value = direction
    update()
    return true
  }

  function undo () {
    if (loading.value || !session.undo()) return false
    facing.value = facingHistory.pop() ?? 'down'
    update()
    return true
  }

  function restart () {
    if (loading.value || !session.restart()) return false
    facingHistory.push(facing.value)
    facing.value = 'down'
    update()
    return true
  }

  onUnmounted(() => {
    cancel(); generator.dispose()
  })
  return { level, state, historyCount, facing, solved, chapter, loading, loadingDisplay, start, cancel, step, undo, restart }
}
