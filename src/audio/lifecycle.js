/** Keep activation in the trusted input stack, including touch release and keyboard-only navigation. */
export function attachAudioLifecycle (player, document, window) {
  function activate (event) {
    if (!event.isTrusted || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return
    if (event.key === 'Escape') return

    // Touch becomes activation on release, not on contact; an early resume can otherwise remain pending.
    if (event.type === 'pointerdown' && event.pointerType !== 'mouse') return
    if (window.navigator?.userActivation?.isActive === false) return

    player.unlock()
  }

  function visibilityChanged () {
    player.setHidden(document.hidden)
  }

  function pageHidden () {
    player.setHidden(true)
  }

  const gestures = ['pointerdown', 'pointerup', 'keydown', 'click']
  for (const name of gestures) document.addEventListener(name, activate, { capture: true, passive: true })

  document.addEventListener('visibilitychange', visibilityChanged)
  window.addEventListener('pagehide', pageHidden)
  window.addEventListener('pageshow', visibilityChanged)
  visibilityChanged()

  return () => {
    for (const name of gestures) document.removeEventListener(name, activate, true)

    document.removeEventListener('visibilitychange', visibilityChanged)
    window.removeEventListener('pagehide', pageHidden)
    window.removeEventListener('pageshow', visibilityChanged)
  }
}
