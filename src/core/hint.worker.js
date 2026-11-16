import { solve } from './solver.js'

self.onmessage = event => {
  try {
    const { level, state, budget = 12000 } = event.data

    // Preserve the solver's result status: exhausting the budget is not proof of a deadlock.
    const result = solve(level, state, budget)
    self.postMessage(result)
  } catch {
    // A failed computation likewise cannot establish that the board is unsolvable.
    self.postMessage({ status: 'error' })
  }
}
