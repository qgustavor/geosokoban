/** Native sharing is optional; callers must display the returned fallback text. */
export async function shareResult (data, platform = globalThis.navigator) {
  if (typeof platform?.share === 'function') {
    try {
      if (typeof platform.canShare !== 'function' || platform.canShare(data)) {
        await platform.share(data)
        return { status: 'shared' }
      }
    } catch (error) {
      if (error.name === 'AbortError') return { status: 'cancelled' }
    }
  }
  return { status: 'fallback', text: [data.text, data.url].filter(Boolean).join('\n') }
}
