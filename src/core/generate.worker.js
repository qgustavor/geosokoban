import { setGeography } from '../geo/world.js'
import { prepareLevel } from './prepare-level.js'

self.onmessage = ({ data }) => {
  try {
    if (data.geography) setGeography(data.geography)
    const level = prepareLevel(data.code, {
      onProgress: progress => self.postMessage({ type: 'progress', ...progress })
    })
    self.postMessage({ type: 'complete', level })
  } catch {
    self.postMessage({ type: 'error', error: true })
  }
}
