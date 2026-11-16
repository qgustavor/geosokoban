import { parentPort } from 'node:worker_threads'

// Adapt the browser worker protocol without replacing its generation or progress logic.
globalThis.self = { postMessage: data => parentPort.postMessage(data) }
await import('../src/core/generate.worker.js')

parentPort.on('message', data => self.onmessage({ data }))
