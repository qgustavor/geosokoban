/** Prefer the native chooser, then the clipboard; expose text only when both are unavailable. */
export async function shareResult (data, platform = globalThis.navigator) {
  if (typeof platform?.share === 'function') {
    try {
      // A platform may support sharing without exposing a capability-check method.
      const canShare = typeof platform.canShare !== 'function' || platform.canShare(data)

      if (canShare) {
        // Do not await preparation before this call: the chooser needs the original button activation.
        await platform.share(data)
        return { status: 'shared' }
      }
    } catch (error) {
      // Cancelling the chooser must not copy anything or open another dialog.
      if (error?.name === 'AbortError') return { status: 'cancelled' }
    }
  }

  const text = [data.text, data.url].filter(Boolean).join('\n')

  try {
    if (typeof platform?.clipboard?.writeText === 'function') {
      await platform.clipboard.writeText(text)
      return { status: 'copied' }
    }
  } catch {
    // Clipboard access may be denied, especially after sharing has consumed user activation.
    // Preserve manual copying instead of turning a blocked browser capability into a dead end.
  }

  return { status: 'fallback', text }
}
