export const LOADER_DELAY_MS = 500
export const LOADER_FINISH_MS = 400

// Presentation estimates are deliberately independent of puzzle selection and search budgets.
// Rounded development-worker p75 values; replace these after representative browser measurements.
export const SEARCH_ESTIMATE_MS = { gentle: 1000, puzzle: 900 }
export const emptyFeedback = () => ({ visible: false, stage: 'map', fraction: 0, indeterminate: false })

const LOADING_STAGES = ['map', 'search', 'ready']

/** The clock is injectable so fast completion, cancellation and delayed replies are testable. */
export function createLoadingFeedback (onChange, {
  now = () => performance.now(),
  schedule = (callback, delay) => setTimeout(callback, delay),
  unschedule = id => clearTimeout(id),
  reducedMotion = () => false,
  delay = LOADER_DELAY_MS,
  finishDelay = LOADER_FINISH_MS
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

    const elapsed = now() - started
    const indeterminateAfter = Math.max(8000, estimate * 3)
    state.indeterminate = elapsed > indeterminateAfter

    // Elapsed time is only a visual estimate, never evidence that generation has finished.
    // Ease toward the upper range and reserve full completion for an actual worker result.
    const easedProgress = 1 - Math.exp(-elapsed / estimate)
    const estimated = 0.12 + 0.76 * easedProgress
    const cappedEstimate = Math.min(0.9, estimated)
    state.fraction = Math.max(state.fraction, cappedEstimate)

    publish()
    tickHandle = schedule(tick, 100)
  }

  function cancel () {
    active = false
    completing = false

    for (const handle of [showHandle, tickHandle, finishHandle]) unschedule(handle)
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
    started = now()
    estimate = planning ? SEARCH_ESTIMATE_MS.puzzle : SEARCH_ESTIMATE_MS.gentle

    // Fast requests finish before this timer, avoiding a brief flash of the loader.
    showHandle = schedule(() => {
      if (!active) return

      state.visible = true
      tick()
    }, delay)
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
    unschedule(showHandle)
    unschedule(tickHandle)

    // An unseen loader needs neither a final frame nor an animation hold.
    if (!state.visible) return Promise.resolve(true)

    state = { ...state, stage: 'ready', fraction: 1, indeterminate: false }
    publish()

    if (reducedMotion()) return Promise.resolve(true)

    // Only the visible completion animation delays the caller; the search estimate never does.
    return new Promise(resolve => {
      resolveFinish = resolve
      finishHandle = schedule(() => {
        resolveFinish = null
        resolve(true)
      }, finishDelay)
    })
  }

  return { start, progress, finish, cancel }
}
