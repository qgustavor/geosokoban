/** Progress messages keep the worker alive. Cancellation never changes the previous board. */
export function generationTask (worker, message, onProgress = () => {}, { terminateOnComplete = true } = {}) {
  let finished = false
  let cancel
  const promise = new Promise((resolve, reject) => {
    const settle = (value, error) => {
      if (finished) return
      finished = true
      worker.onmessage = null
      worker.onerror = null
      worker.onmessageerror = null
      if (terminateOnComplete || error || !value) worker.terminate()
      if (error) reject(error)
      else resolve(value)
    }
    cancel = () => settle(null)
    worker.onmessage = ({ data }) => {
      if (data?.type === 'progress') {
        onProgress(data)
      } else if (data?.type === 'complete' && data.level) {
        settle(data.level)
      } else {
        settle(null, new Error('Generation failed'))
      }
    }
    worker.onerror = () => settle(null, new Error('Generation unavailable'))
    worker.onmessageerror = () => settle(null, new Error('Generation response unavailable'))
    try {
      worker.postMessage(message)
    } catch (error) {
      settle(null, error)
    }
  })
  return { promise, cancel }
}
