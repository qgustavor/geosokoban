import { generationTask } from './generation-task.js'

/** Keep successful workers warm; termination is reserved for cancellation/errors. */
export function createGenerationClient (createWorker) {
  let worker = null
  let geographySent = null
  let pending = null

  function cancel () {
    if (!pending) return

    // Cancelling a busy task terminates its worker. Clear the geography marker
    // too: a replacement worker will not have the previous worker's map data.
    pending.cancel()
    pending = null
    worker = null
    geographySent = null
  }

  return {
    async generate (code, geography, onProgress) {
      cancel()
      worker ??= createWorker()

      // Geography is large. Send it only when its object identity changes, or
      // when a new worker has not yet completed a request using that geography.
      const message = { code }
      if (geographySent !== geography) message.geography = geography

      const task = generationTask(worker, message, onProgress, { terminateOnComplete: false })
      pending = task

      try {
        const level = await task.promise

        // A cancelled task may settle after a replacement request has started.
        // It must not update that request's worker state or supply its board.
        if (pending !== task) return null

        geographySent = geography
        return level
      } catch (error) {
        if (pending === task) {
          worker = null
          geographySent = null
        }

        throw error
      } finally {
        // The same identity guard keeps an older task from clearing the new one.
        if (pending === task) pending = null
      }
    },
    cancel,
    dispose () {
      cancel()

      // cancel handles busy workers; an idle, successfully reused worker still
      // needs explicit termination when the client is no longer needed.
      worker?.terminate()
      worker = null
      geographySent = null
    }
  }
}
