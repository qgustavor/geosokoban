/** A short swipe makes one move. A long drag can make more moves without a direction pad. */
export function createSwipeInput (step, { threshold = 28, maxSteps = 3 } = {}) {
  let gesture = null

  return {
    start (id, x, y) {
      gesture = { id, x, y, moved: false }
    },

    move (id, x, y) {
      // Only the pointer that started the gesture can move it or end it.
      if (!gesture || gesture.id !== id) return false

      const dx = x - gesture.x
      const dy = y - gesture.y
      // Choose one axis per event rather than making diagonal moves; ties use the vertical axis.
      const horizontal = Math.abs(dx) > Math.abs(dy)
      const distance = horizontal ? dx : dy
      const thresholdCrossings = Math.floor(Math.abs(distance) / threshold)
      const count = Math.min(maxSteps, thresholdCrossings)
      if (!count) return false

      let direction
      if (horizontal) direction = distance > 0 ? 'right' : 'left'
      else direction = distance > 0 ? 'down' : 'up'

      // The cap limits a single large pointer jump. Blocked moves still consume this gesture segment.
      for (let index = 0; index < count; index++) step(direction)

      // Restart at the current pointer position, discarding overshoot rather than queuing more moves.
      gesture.x = x
      gesture.y = y
      gesture.moved = true

      return true
    },

    end (id) {
      if (!gesture || gesture.id !== id) return false

      // Report whether the gesture requested movement, so the caller can distinguish it from a tap.
      const moved = gesture.moved
      gesture = null

      return moved
    },

    cancel () {
      gesture = null
    }
  }
}
