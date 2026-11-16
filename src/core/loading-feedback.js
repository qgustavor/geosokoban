export const LOADER_DELAY_MS = 500
export const LOADER_FINISH_MS = 400

// Presentation estimates are deliberately independent of puzzle selection and search budgets.
// Rounded development-worker p75 values; replace these after representative browser measurements.
export const SEARCH_ESTIMATE_MS = { gentle: 1000, puzzle: 900 }
export const emptyFeedback = () => ({ visible: false, stage: 'map', fraction: 0, indeterminate: false })

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
  const publish = () => onChange({ ...state })

  function tick () {
    if (!active || completing) return
    const elapsed = now() - started
    state.indeterminate = elapsed > Math.max(8000, estimate * 3)
    const estimated = 0.12 + 0.76 * (1 - Math.exp(-elapsed / estimate))
    state.fraction = Math.max(state.fraction, Math.min(0.9, estimated))
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
    showHandle = schedule(() => {
      if (!active) return
      state.visible = true
      tick()
    }, delay)
  }

  function progress ({ stage }) {
    if (!active || completing || !['map', 'search', 'ready'].includes(stage)) return
    // Later retries cannot move the stage or the bar backward.
    if (['map', 'search', 'ready'].indexOf(stage) < ['map', 'search', 'ready'].indexOf(state.stage)) return
    state.stage = stage
    if (stage === 'ready') state.fraction = Math.max(state.fraction, 0.94)
    publish()
  }

  function finish () {
    if (!active) return Promise.resolve(false)
    completing = true
    unschedule(showHandle)
    unschedule(tickHandle)
    if (!state.visible) return Promise.resolve(true)
    state = { ...state, stage: 'ready', fraction: 1, indeterminate: false }
    publish()
    if (reducedMotion()) return Promise.resolve(true)
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
