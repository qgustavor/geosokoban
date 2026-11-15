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
    if (next === this.state) return false
    this.history.push(this.state)
    this.state = next
    return true
  }

  undo () {
    if (!this.history.length) return false
    this.state = this.history.pop()
    return true
  }

  restart () {
    if (this.state.moves === 0) return false
    this.history.push(this.state)
    this.state = initialState(this.level)
    return true
  }
}
