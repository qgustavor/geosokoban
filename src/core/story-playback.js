/** A scene owns its continuation until it is finished or explicitly cancelled. */
export function createStoryPlayback (resolveScene, onChange) {
  let continuation = null

  function cancel () {
    // Route changes must discard the old departure rather than execute it.
    continuation = null
    onChange(null)
  }

  function finish () {
    const next = continuation
    cancel()
    next?.()
  }

  function start (code, phase, next) {
    cancel()

    if (!resolveScene(code, phase)) {
      next?.()
      return
    }

    continuation = next
    onChange({ code, phase })
  }

  return { start, finish, cancel }
}

/** Recompute stage directions from the start so Back restores the magnet as well as the words. */
export function storyStage (scene, index) {
  const stage = {}
  for (const line of scene.lines.slice(0, index + 1)) Object.assign(stage, line.stage)
  return stage
}
