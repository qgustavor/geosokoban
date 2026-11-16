import { computed, onUnmounted, ref, watch } from 'vue'
import { isSolved, initialState, replay } from '../core/engine.js'
import { isDefinitelyStuck } from '../core/solver.js'
import { makeHintPlan, hintOverlay, advanceHintPlan } from '../core/hints.js'
import { createHintCooldown } from '../core/hint-cooldown.js'

function signature (level, state) {
  // Walking without moving a flag does not require another solvability search.
  // Keep flag identities as well as positions because each has its own destination.
  const levelId = level.id
  const flagPositions = state.boxes.map(box => `${box.id}:${box.position}`).join('|')

  return `${levelId}|${flagPositions}`
}

export function useAssistance (level, state, onAssisted) {
  const stage = ref(0)
  const plan = ref(null)
  const busy = ref(false)
  const warning = ref(false)
  const unavailable = ref(false)

  const cooldownSeconds = ref(0)
  const cooldown = createHintCooldown(seconds => {
    cooldownSeconds.value = seconds
  })

  // Explicit hints and silent deadlock checks have separate workers and budgets;
  // cancelling one must not cancel the other.
  let hintWorker = null
  let checkWorker = null
  let hintDeadline = null
  let checkDeadline = null
  let hintRevision = 0
  let checkRevision = 0

  function cancelHint () {
    // A queued worker reply may outlive termination. Invalidate its request first.
    hintRevision++
    hintWorker?.terminate()
    hintWorker = null
    clearTimeout(hintDeadline)
    busy.value = false
  }

  function clearHint () {
    // Hiding, moving, undoing and restarting clear the overlay, not the cooldown.
    cancelHint()
    stage.value = 0
    plan.value = null
    unavailable.value = false
  }

  function cancelCheck () {
    checkRevision++
    checkWorker?.terminate()
    checkWorker = null
    clearTimeout(checkDeadline)
  }

  function reveal () {
    if (!plan.value || stage.value >= 4) return

    // Revealing a clue counts as assistance; merely requesting a failed search does not.
    stage.value++
    onAssisted()
  }

  function acceptSolution (moves) {
    plan.value = makeHintPlan(level.value, state.value, moves)
    busy.value = false

    if (plan.value) reveal()
    else unavailable.value = true
  }

  function request () {
    if (isSolved(level.value, state.value) || busy.value || stage.value >= 4) return
    if (!cooldown.tryStart()) return

    // Escalating an existing clue consumes the same cooldown as finding a new one.
    if (plan.value) {
      reveal()
      return
    }

    unavailable.value = false

    // A stored certificate is valid only for its exact starting position.
    // A different player position would change the walking steps even with identical flags.
    const initial = initialState(level.value)
    const isStartingPosition = state.value.player === initial.player &&
      state.value.boxes.every((box, index) => box.position === initial.boxes[index].position)

    if (isStartingPosition) {
      const verified = replay(level.value, level.value.solution)

      if (verified.valid && isSolved(level.value, verified.state)) {
        acceptSolution(level.value.solution)
        return
      }
    }

    cancelHint()
    busy.value = true
    const revision = hintRevision

    try {
      hintWorker = new Worker(new URL('../core/hint.worker.js', import.meta.url), { type: 'module' })
      hintWorker.onmessage = ({ data }) => {
        if (revision !== hintRevision) return

        cancelHint()

        // Only a completed unsolvability search warrants a deadlock warning.
        // Running out of work or time means a hint is unavailable, not that the puzzle is lost.
        if (data.status === 'solved') acceptSolution(data.moves)
        else if (data.status === 'unsolvable') warning.value = true
        else unavailable.value = true
      }
      hintWorker.onerror = () => {
        cancelHint()
        unavailable.value = true
      }

      // The state budget bounds search work; the separate timer bounds how long the UI waits.
      hintWorker.postMessage({ level: level.value, state: state.value, budget: 15000 })
      hintDeadline = setTimeout(() => {
        cancelHint()
        unavailable.value = true
      }, 5000)
    } catch {
      cancelHint()
      unavailable.value = true
    }
  }

  function checkSilently () {
    cancelCheck()
    warning.value = false

    if (isSolved(level.value, state.value)) return

    // Cheap, definite deadlocks need no worker; uncertain positions get a bounded search.
    if (isDefinitelyStuck(level.value, state.value)) {
      warning.value = true
      return
    }

    const revision = checkRevision
    const current = signature(level.value, state.value)

    try {
      checkWorker = new Worker(new URL('../core/hint.worker.js', import.meta.url), { type: 'module' })
      checkWorker.onmessage = ({ data }) => {
        if (revision !== checkRevision) return
        if (current !== signature(level.value, state.value)) return

        warning.value = data.status === 'unsolvable'
        cancelCheck()
      }
      checkWorker.onerror = cancelCheck

      // Background checks get less work and time than requested hints, and fail silently.
      checkWorker.postMessage({ level: level.value, state: state.value, budget: 5000 })
      checkDeadline = setTimeout(cancelCheck, 2500)
    } catch {
      cancelCheck()
    }
  }

  // Observe each state replacement so multiple moves cannot skip a clue's next-step check.
  watch([level, state], ([nextLevel, next], [previousLevel, previous]) => {
    // Keep a clue only while the player follows its exact next move on the same board.
    // Undo, restart and deviations invalidate its remaining route.
    const advanced = nextLevel === previousLevel && plan.value
      ? advanceHintPlan(nextLevel, plan.value, stage.value, previous, next)
      : null

    if (advanced && !advanced.complete) plan.value = advanced
    else clearHint()

    if (nextLevel !== previousLevel) {
      cancelCheck()
      warning.value = false
    } else if (signature(nextLevel, next) !== signature(previousLevel, previous)) {
      checkSilently()
    }
  }, { flush: 'sync' })

  onUnmounted(() => {
    cooldown.dispose()
    cancelHint()
    cancelCheck()
  })

  return {
    stage,
    plan,
    busy,
    warning,
    unavailable,
    cooldownSeconds,
    request,
    clearHint,
    overlay: computed(() => hintOverlay(plan.value, stage.value, state.value))
  }
}
