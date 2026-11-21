const DELIVERY_HOLD_MS = 1100
export const CLEAR_BANNER_MS = 2000

/** Reading time is separate from animation so reduced motion still shows the last flag. */
export function createCompletionSequence (update) {
  let timer = null
  let revision = 0

  function reset () {
    // Invalidate callbacks as well as clearing the timer: an older sequence must not open results.
    revision++
    clearTimeout(timer)
    timer = null

    update('playing')
  }

  function start () {
    reset()
    const token = revision

    // Let the final delivery remain readable before replacing it with the clear banner.
    update('delivery')
    timer = setTimeout(() => {
      if (token !== revision) return

      update('clear')
      timer = setTimeout(() => {
        if (token !== revision) return

        timer = null
        update('results')
      }, CLEAR_BANNER_MS)
    }, DELIVERY_HOLD_MS)
  }

  return { start, reset }
}
