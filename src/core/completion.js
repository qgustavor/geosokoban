export const DELIVERY_HOLD_MS = 1100
export const CLEAR_BANNER_MS = 900

/** Reading time is separate from animation so reduced motion still shows the last flag. */
export function createCompletionSequence (update, {
  schedule = (callback, delay) => setTimeout(callback, delay),
  clear = timer => clearTimeout(timer)
} = {}) {
  let timer = null
  let revision = 0
  function reset () {
    revision++
    clear(timer)
    timer = null
    update('playing')
  }
  function start () {
    reset()
    const token = revision
    update('delivery')
    timer = schedule(() => {
      if (token !== revision) return
      update('clear')
      timer = schedule(() => {
        if (token !== revision) return
        timer = null
        update('results')
      }, CLEAR_BANNER_MS)
    }, DELIVERY_HOLD_MS)
  }
  return { start, reset }
}
