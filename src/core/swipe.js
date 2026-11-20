/** A swipe in any direction makes exactly one move. Lift and swipe again to take another step. */
export function createSwipeInput (step, { threshold = 32 } = {}) {
  let gesture = null

  return {
    start (id, x, y) {
      gesture = { id, x, y, moved: false }
    },

    move (id, x, y) {
      // Only the pointer that started the gesture can move it.
      if (!gesture || gesture.id !== id) return false

      // Once this swipe has triggered a step, ignore all further motion until the finger lifts.
      if (gesture.moved) return true

      const dx = x - gesture.x
      const dy = y - gesture.y

      // Choose dominant axis; ties favor the vertical axis.
      const horizontal = Math.abs(dx) > Math.abs(dy)
      const distance = horizontal ? dx : dy

      if (Math.abs(distance) < threshold) return false

      const direction = horizontal
        ? (distance > 0 ? 'right' : 'left')
        : (distance > 0 ? 'down' : 'up')

      step(direction)
      gesture.moved = true

      return true
    },

    end (id) {
      if (!gesture || gesture.id !== id) return false

      // Return whether this gesture moved, so pointerup knows to suppress click/inspect.
      const moved = gesture.moved
      gesture = null

      return moved
    },

    cancel () {
      gesture = null
    }
  }
}
