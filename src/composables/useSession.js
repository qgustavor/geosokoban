import { computed, shallowRef, ref, onUnmounted } from 'vue'
import { Session } from '../core/session.js'
import { isSolved } from '../core/engine.js'
import { loadGeography } from '../geo/world.js'
import { storyLevel } from '../content/story.js'
import { isPlanningCode } from '../core/seed.js'
import { storyCode, storyIndex } from '../content/regions.js'
import { createGenerationClient } from '../core/generation-client.js'
import { createLevelCache } from '../core/level-cache.js'
import { createLoadingFeedback, emptyFeedback } from '../core/loading-feedback.js'

export function useSession ({ reducedMotion = () => false } = {}) {
  // Publish whole snapshots rather than deeply proxying the engine's board and history.
  const level = shallowRef(storyLevel(storyCode(1)))
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
  const generator = createGenerationClient(() => {
    return new Worker(new URL('../core/generate.worker.js', import.meta.url), { type: 'module' })
  })

  let revision = 0
  let cancelRequest = null

  function cancel () {
    // Invalidate continuations before aborting work: an old request must not publish
    // a board or clear the loading state belonging to a newer request.
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
    // Story and cached boards are already prepared, so they need neither geography nor a loader.
    const cached = storyLevel(code) ?? cache.get(code)

    try {
      let next = cached

      if (!cached) {
        loading.value = true
        feedback.start(isPlanningCode(code))

        // Cancellation first owns the map request, then transfers to the generation worker.
        const controller = new AbortController()
        cancelRequest = () => controller.abort()
        const geography = await loadGeography({ signal: controller.signal })
        if (current !== revision) return false

        cancelRequest = generator.cancel
        next = await generator.generate(code, geography, feedback.progress)
        if (current !== revision || !next) return false

        // Cache completed work before the visual finish hold; cancelling that hold
        // should not discard a board that has already been successfully prepared.
        cache.set(next)
        cancelRequest = null
        if (!await feedback.finish()) return false
      }

      // The finish hold is asynchronous too, so ownership must be checked again.
      if (current !== revision || !next) return false

      session = new Session(next)
      level.value = next
      update()
      facing.value = 'down'
      facingHistory = []

      return true
    } catch (error) {
      // Cancellation supersedes both successful results and errors from the old request.
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

    // Keep facing history aligned with accepted engine actions, not blocked input attempts.
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

    // Restart adds an undo entry in Session, so undo must also restore the previous facing.
    facingHistory.push(facing.value)
    facing.value = 'down'
    update()

    return true
  }

  onUnmounted(() => {
    cancel()
    generator.dispose()
  })

  return {
    level,
    state,
    historyCount,
    facing,
    solved,
    chapter,
    loading,
    loadingDisplay,
    start,
    cancel,
    step,
    undo,
    restart
  }
}
