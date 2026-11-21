const LOADER_DELAY_MS = 500
const LOADER_FINISH_MS = 400

// Presentation estimates are deliberately independent of puzzle selection and search budgets.
// Estimates affect only the progress animation; they are not generation deadlines.
const SEARCH_ESTIMATE_MS = { gentle: 1000, puzzle: 900 }
export const emptyFeedback = () => ({ visible: false, stage: 'map', fraction: 0, indeterminate: false })

const LOADING_STAGES = ['map', 'search', 'ready']

/** Delay the loader to avoid flashing it for fast work, and release every pending hold on cancellation. */
export function createLoadingFeedback (onChange, {
  reducedMotion = () => false
} = {}) {
  let state = emptyFeedback()
  let active = false
  let completing = false
  let started = 0
  let estimate = SEARCH_ESTIMATE_MS.gentle
  let showHandle
  let tickHandle
  let finishHandle
  let resolveFinish

  // Publish a snapshot so later ticks cannot mutate a previously delivered display state.
  const publish = () => onChange({ ...state })

  function tick () {
    if (!active || completing) return

    const elapsed = performance.now() - started
    const indeterminateAfter = Math.max(8000, estimate * 3)
    state.indeterminate = elapsed > indeterminateAfter

    // Elapsed time is only a visual estimate, never evidence that generation has finished.
    // Ease toward the upper range and reserve full completion for an actual worker result.
    const easedProgress = 1 - Math.exp(-elapsed / estimate)
    const estimated = 0.12 + 0.76 * easedProgress
    const cappedEstimate = Math.min(0.9, estimated)
    state.fraction = Math.max(state.fraction, cappedEstimate)

    publish()
    tickHandle = setTimeout(tick, 100)
  }

  function cancel () {
    active = false
    completing = false

    for (const handle of [showHandle, tickHandle, finishHandle]) clearTimeout(handle)
    showHandle = undefined
    tickHandle = undefined
    finishHandle = undefined

    // A caller waiting for the completion hold must also learn that the request was cancelled.
    resolveFinish?.(false)
    resolveFinish = null

    state = emptyFeedback()
    publish()
  }

  function start (planning = false) {
    cancel()
    active = true
    started = performance.now()
    estimate = planning ? SEARCH_ESTIMATE_MS.puzzle : SEARCH_ESTIMATE_MS.gentle

    // Fast requests finish before this timer, avoiding a brief flash of the loader.
    showHandle = setTimeout(() => {
      if (!active) return

      state.visible = true
      tick()
    }, LOADER_DELAY_MS)
  }

  function progress ({ stage }) {
    if (!active || completing || !LOADING_STAGES.includes(stage)) return

    // Later retries cannot move the stage or the bar backward.
    const nextStageIndex = LOADING_STAGES.indexOf(stage)
    const currentStageIndex = LOADING_STAGES.indexOf(state.stage)
    if (nextStageIndex < currentStageIndex) return

    state.stage = stage
    if (stage === 'ready') state.fraction = Math.max(state.fraction, 0.94)

    publish()
  }

  function finish () {
    if (!active) return Promise.resolve(false)

    completing = true
    clearTimeout(showHandle)
    clearTimeout(tickHandle)

    // An unseen loader needs neither a final frame nor an animation hold.
    if (!state.visible) return Promise.resolve(true)

    state = { ...state, stage: 'ready', fraction: 1, indeterminate: false }
    publish()

    if (reducedMotion()) return Promise.resolve(true)

    // Only the visible completion animation delays the caller; the search estimate never does.
    return new Promise(resolve => {
      resolveFinish = resolve
      finishHandle = setTimeout(() => {
        resolveFinish = null
        resolve(true)
      }, LOADER_FINISH_MS)
    })
  }

  return { start, progress, finish, cancel }
}
