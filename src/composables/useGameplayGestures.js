import { watch, onUnmounted } from 'vue'

/** Stop browser-level pinches while playing; GameBoard owns its independent camera. */
export function useGameplayGestures (active) {
  const preventGesture = event => {
    if (event.cancelable) event.preventDefault()
  }
  const preventPinch = event => {
    if (event.touches.length > 1) preventGesture(event)
  }
  const preventWheelZoom = event => {
    if (event.ctrlKey) preventGesture(event)
  }

  function restore () {
    document.documentElement.classList.remove('gameplay-active')
    document.removeEventListener('gesturestart', preventGesture)
    document.removeEventListener('gesturechange', preventGesture)
    document.removeEventListener('touchmove', preventPinch)
    document.removeEventListener('wheel', preventWheelZoom)
  }

  watch(active, playing => {
    restore()
    if (!playing) return
    document.documentElement.classList.add('gameplay-active')
    // Safari's gesture events supplement touch-action; all listeners are removed on exit.
    document.addEventListener('gesturestart', preventGesture, { passive: false })
    document.addEventListener('gesturechange', preventGesture, { passive: false })
    document.addEventListener('touchmove', preventPinch, { passive: false })
    document.addEventListener('wheel', preventWheelZoom, { passive: false })
  }, { immediate: true })

  onUnmounted(restore)
}
