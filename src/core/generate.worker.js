import { setGeography } from '../geo/world.js'
import { generate } from './generate.js'

self.onmessage = ({ data }) => {
  try {
    // Reused workers retain their geography; only a supplied replacement needs to be installed.
    if (data.geography) setGeography(data.geography)

    const level = generate(data.code, {
      onProgress: progress => self.postMessage({ type: 'progress', ...progress })
    })

    // Progress and completion share a channel, but only this message carries the finished board.
    self.postMessage({ type: 'complete', level })
  } catch (error) {
    self.postMessage({ type: 'error', reason: error.name, message: error.message })
  }
}
