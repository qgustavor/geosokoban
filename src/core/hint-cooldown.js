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
    return disposed || deadline === null ? 0 : Math.max(0, deadline - now())
  }

  function update () {
    if (timer !== null) clear(timer)
    timer = null
    if (disposed) return
    const remaining = remainingMilliseconds()
    onChange(Math.ceil(remaining / 1000))
    if (remaining > 0) timer = schedule(update, Math.min(1000, remaining))
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
