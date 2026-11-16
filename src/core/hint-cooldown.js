export const HINT_COOLDOWN_MS = 10000

/**
 * A request gate, not a delayed reveal: the first hint is immediate, but every
 * accepted request consumes ten seconds. Use elapsed time rather than counting
 * timer ticks so background-tab throttling cannot shorten the wait.
 */
export function createHintCooldown (onChange, {
  now = () => globalThis.performance?.now() ?? Date.now(),
  schedule = setTimeout,
  clear = clearTimeout
} = {}) {
  let deadline = null
  let timer = null
  let disposed = false

  function remainingMilliseconds () {
    if (disposed || deadline === null) return 0

    return Math.max(0, deadline - now())
  }

  function update () {
    if (timer !== null) clear(timer)
    timer = null

    if (disposed) return

    const remaining = remainingMilliseconds()
    // Round upward so the display cannot say zero while the request gate is still closed.
    const remainingSeconds = Math.ceil(remaining / 1000)
    onChange(remainingSeconds)

    if (remaining > 0) {
      // The final tick may be less than a second away after a delayed callback or a fractional clock tick.
      const nextUpdateDelay = Math.min(1000, remaining)
      timer = schedule(update, nextUpdateDelay)
    }
  }

  function tryStart () {
    // Check the deadline directly: stale UI/timer callbacks never grant a hint.
    if (disposed || remainingMilliseconds() > 0) return false

    deadline = now() + HINT_COOLDOWN_MS
    update()

    return true
  }

  function dispose () {
    disposed = true
    if (timer !== null) clear(timer)

    timer = null
    deadline = null
  }

  return { tryStart, remainingMilliseconds, dispose }
}
