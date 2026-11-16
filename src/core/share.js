/** Native sharing is optional; callers must display the returned fallback text. */
export async function shareResult (data, platform = globalThis.navigator) {
  if (typeof platform?.share === 'function') {
    try {
      // A platform may support sharing without exposing a capability-check method.
      const canShare = typeof platform.canShare !== 'function' || platform.canShare(data)
      if (canShare) {
        await platform.share(data)
        return { status: 'shared' }
      }
    } catch (error) {
      // Treat an aborted native sheet as cancellation rather than opening another dialog.
      if (error.name === 'AbortError') return { status: 'cancelled' }
    }
  }

  // Unsupported data and other native-sharing failures use the same visible text fallback.
  const text = [data.text, data.url].filter(Boolean).join('\n')

  return { status: 'fallback', text }
}
