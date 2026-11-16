import { initialState, move } from './engine.js'

/** States are immutable snapshots; history has no arbitrary length limit. */
export class Session {
  constructor (level) {
    this.level = level
    this.state = initialState(level)
    this.history = []
  }

  step (direction) {
    const next = move(this.level, this.state, direction)

    // The engine returns the same snapshot for a blocked move, so it must not add an undo entry.
    if (next === this.state) return false

    this.history.push(this.state)
    this.state = next

    return true
  }

  undo () {
    if (!this.history.length) return false

    // Restore the entire snapshot, including move and push counts, rather than trying to reverse a push.
    this.state = this.history.pop()

    return true
  }

  restart () {
    if (this.state.moves === 0) return false

    // Restart is itself undoable; retain the current position instead of clearing the history.
    this.history.push(this.state)
    this.state = initialState(this.level)

    return true
  }
}
