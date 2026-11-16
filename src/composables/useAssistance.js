import { computed, onUnmounted, ref, watch } from 'vue'
import { isSolved, initialState, replay } from '../core/engine.js'
import { isDefinitelyStuck } from '../core/solver.js'
import { makeHintPlan, hintOverlay, advanceHintPlan } from '../core/hints.js'
import { createHintCooldown } from '../core/hint-cooldown.js'

const signature = (level, state) => `${level.id}|${state.boxes.map(box => `${box.id}:${box.position}`).join('|')}`

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
  let hintWorker = null
  let checkWorker = null
  let hintDeadline = null
  let checkDeadline = null
  let hintRevision = 0
  let checkRevision = 0

  function cancelHint () {
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
    if (plan.value) {
      reveal()
      return
    }
    unavailable.value = false
    // A stored certificate is valid only for its exact starting position.
    const initial = initialState(level.value)
    if (state.value.player === initial.player && state.value.boxes.every((box, index) => box.position === initial.boxes[index].position)) {
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
        if (data.status === 'solved') acceptSolution(data.moves)
        else if (data.status === 'unsolvable') warning.value = true
        else unavailable.value = true
      }
      hintWorker.onerror = () => {
        cancelHint()
        unavailable.value = true
      }
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
    if (isDefinitelyStuck(level.value, state.value)) {
      warning.value = true
      return
    }
    const revision = checkRevision
    const current = signature(level.value, state.value)
    try {
      checkWorker = new Worker(new URL('../core/hint.worker.js', import.meta.url), { type: 'module' })
      checkWorker.onmessage = ({ data }) => {
        if (revision !== checkRevision || current !== signature(level.value, state.value)) return
        warning.value = data.status === 'unsolvable'
        cancelCheck()
      }
      checkWorker.onerror = cancelCheck
      checkWorker.postMessage({ level: level.value, state: state.value, budget: 5000 })
      checkDeadline = setTimeout(cancelCheck, 2500)
    } catch {
      cancelCheck()
    }
  }

  watch([level, state], ([nextLevel, next], [previousLevel, previous]) => {
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
