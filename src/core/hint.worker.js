import { solve } from './solver.js'

self.onmessage = event => {
  try {
    const { level, state, budget = 12000 } = event.data
    self.postMessage(solve(level, state, budget))
  } catch {
    self.postMessage({ status: 'error' })
  }
}
