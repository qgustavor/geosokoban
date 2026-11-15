/** A short swipe makes one move. A long drag can make more moves without a direction pad. */
export function createSwipeInput (step, { threshold = 28, maxSteps = 3 } = {}) {
  let gesture = null
  return {
    start (id, x, y) { gesture = { id, x, y, moved: false } },
    move (id, x, y) {
      if (!gesture || gesture.id !== id) return false
      const dx = x - gesture.x
      const dy = y - gesture.y
      const horizontal = Math.abs(dx) > Math.abs(dy)
      const distance = horizontal ? dx : dy
      const count = Math.min(maxSteps, Math.floor(Math.abs(distance) / threshold))
      if (!count) return false
      const direction = horizontal ? distance > 0 ? 'right' : 'left' : distance > 0 ? 'down' : 'up'
      for (let index = 0; index < count; index++) step(direction)
      gesture.x = x
      gesture.y = y
      gesture.moved = true
      return true
    },
    end (id) {
      if (!gesture || gesture.id !== id) return false
      const moved = gesture.moved
      gesture = null
      return moved
    },
    cancel () { gesture = null }
  }
}
