import { generationTask } from './generation-task.js'

/** Keep successful workers warm; termination is reserved for cancellation/errors. */
export function createGenerationClient (createWorker) {
  let worker = null
  let geographySent = null
  let pending = null

  function cancel () {
    if (!pending) return
    pending.cancel()
    pending = null
    worker = null
    geographySent = null
  }

  return {
    async generate (code, geography, onProgress) {
      cancel()
      worker ??= createWorker()
      const message = { code }
      if (geographySent !== geography) message.geography = geography
      const task = generationTask(worker, message, onProgress, { terminateOnComplete: false })
      pending = task
      try {
        const level = await task.promise
        if (pending !== task) return null
        geographySent = geography
        return level
      } catch (error) {
        if (pending === task) { worker = null; geographySent = null }
        throw error
      } finally {
        if (pending === task) pending = null
      }
    },
    cancel,
    dispose () {
      cancel()
      worker?.terminate()
      worker = null
      geographySent = null
    }
  }
}
