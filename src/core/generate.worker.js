import { setGeography } from '../geo/world.js'
import { prepareLevel } from './prepare-level.js'

self.onmessage = ({ data }) => {
  try {
    // Reused workers retain their geography; only a supplied replacement needs to be installed.
    if (data.geography) setGeography(data.geography)

    const level = prepareLevel(data.code, {
      onProgress: progress => self.postMessage({ type: 'progress', ...progress })
    })

    // Progress and completion share a channel, but only this message carries the finished board.
    self.postMessage({ type: 'complete', level })
  } catch {
    // Search exhaustion is handled by prepareLevel; other failures remain errors for the client.
    self.postMessage({ type: 'error', error: true })
  }
}
