/** Progress messages keep the worker alive. Cancellation never changes the previous board. */
export function generationTask (worker, message, onProgress = () => {}) {
  let finished = false
  let cancel

  const promise = new Promise((resolve, reject) => {
    const settle = (value, error) => {
      // Completion, cancellation and transport errors all compete to settle this one request.
      if (finished) return

      finished = true
      worker.onmessage = null
      worker.onerror = null
      worker.onmessageerror = null

      // Only a successful result may leave the worker available for another board.
      if (error || !value) worker.terminate()

      if (error) reject(error)
      else resolve(value)
    }

    // null means cancellation, not a replacement level or a failed generation attempt.
    cancel = () => settle(null)

    worker.onmessage = ({ data }) => {
      if (data?.type === 'progress') {
        // A progress update is not a final response and must not release the worker.
        onProgress(data)
      } else if (data?.type === 'complete' && data.level) {
        settle(data.level)
      } else {
        const error = new Error(data?.message ?? 'Generation failed')
        error.name = data?.reason ?? 'GenerationError'
        settle(null, error)
      }
    }

    worker.onerror = () => settle(null, new Error('Generation unavailable'))
    worker.onmessageerror = () => settle(null, new Error('Generation response unavailable'))

    // Posting can fail before any worker event arrives, so it uses the same cleanup path.
    try {
      worker.postMessage(message)
    } catch (error) {
      settle(null, error)
    }
  })

  return { promise, cancel }
}
