import { createSwipeInput } from './swipe.js'

/** One finger moves; two fingers manipulate only the camera. No browser zoom is involved. */
export function createBoardInput (step, transform, options) {
  const swipe = createSwipeInput(step, options)
  const pointers = new Map()
  let multiTouch = false
  let suppressClick = false
  let origin = null
  let revision = 0

  function pair () {
    const [a, b] = pointers.values()
    return {
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
      distance: Math.hypot(a.x - b.x, a.y - b.y)
    }
  }

  const input = {
    get ids () {
      return [...pointers.keys()]
    },
    get active () {
      return pointers.size > 0
    },
    get captured () {
      return multiTouch || suppressClick
    },

    down (id, x, y) {
      if (pointers.has(id)) return
      if (!pointers.size) {
        multiTouch = false
        suppressClick = false
      }
      pointers.set(id, { x, y })
      if (pointers.size === 1 && !multiTouch) swipe.start(id, x, y)
      else {
        multiTouch = true
        suppressClick = true
        swipe.cancel()
        if (pointers.size === 2) {
          origin = pair()
          revision++
        }
      }
    },

    move (id, x, y) {
      if (!pointers.has(id)) return
      pointers.set(id, { x, y })
      if (pointers.size >= 2) {
        const after = pair()
        // Use the gesture's original pair, not the last event. Browsers update fingers separately;
        // incremental clamping would otherwise turn a pan at the zoom limit into an unwanted zoom.
        transform({
          from: origin,
          to: after,
          scale: origin.distance > 1 ? after.distance / origin.distance : 1,
          gesture: revision
        })
      } else if (!multiTouch) {
        suppressClick = swipe.move(id, x, y) || suppressClick
      }
    },

    up (id, x, y, cancelled = false) {
      if (!pointers.has(id)) return
      // A cancellation is not a final movement sample (its coordinates can even be zero).
      if (!cancelled) input.move(id, x, y)
      suppressClick = swipe.end(id) || suppressClick || cancelled
      const controlledPair = [...pointers.keys()].slice(0, 2).includes(id)
      pointers.delete(id)
      if (controlledPair && pointers.size >= 2) {
        origin = pair()
        revision++
      }
      if (cancelled) {
        multiTouch = pointers.size > 0
        swipe.cancel()
      }
      // After a pinch, the remaining finger stays inert until ALL fingers have lifted.
      if (!pointers.size) {
        multiTouch = false
        origin = null
      }
    },

    consumeClick () {
      // Some browsers can click on each touch release. Keep the latch until the next gesture.
      return suppressClick
    },

    reset () {
      pointers.clear()
      swipe.cancel()
      multiTouch = false
      origin = null
      suppressClick = true
    }
  }
  return input
}
