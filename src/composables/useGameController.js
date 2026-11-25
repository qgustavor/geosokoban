import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { puzzleLocation, guardedPuzzleLocation } from '../router/locations.js'
import { shareResult } from '../core/share.js'
import { useStoryDialogue } from './useStoryDialogue.js'
import { resumeStory } from '../content/story.js'
import { useSession } from './useSession.js'
import { useAssistance } from './useAssistance.js'
import { useGameAudio } from './useGameAudio.js'
import { movementSound } from '../audio/score.js'
import { normalizeCode, puzzleDate, isPlanningCode } from '../core/seed.js'
import { CHALLENGES, challengeSettings, challengeName } from '../core/challenge.js'
import { storyCode, storyIndex, storyGuidance, STORY_COUNT } from '../content/regions.js'
import countries from '../data/countries.json' with { type: 'json' }
import { readPreferences, savePreferences } from '../ui/storage.js'
import { createRun, finishRunLevel, reopenRunLevel, elapsedRun, formatElapsed, runTotals } from '../core/run.js'
import { utcDay } from '../core/dates.js'
import { useGameplayGestures } from './useGameplayGestures.js'

export function useGameController () {
  const router = useRouter()
  const route = useRoute()
  const saved = readPreferences()
  const audio = reactive(useGameAudio(saved))
  const detected = navigator.language.startsWith('pt')
    ? 'pt-BR'
    : navigator.language.startsWith('es') ? 'es' : 'en'

  const { t, locale } = useI18n({ useScope: 'global' })
  locale.value = saved.locale ?? detected
  const completed = ref(saved.completed)
  const pendingStory = ref(saved.pendingStory)
  const speedrun = ref(saved.speedrun)
  const storyRun = ref(saved.storyRun)
  const activeRun = ref(null)
  const storyFinished = ref(false)
  const now = ref(Date.now())
  const elapsed = computed(() => elapsedRun(activeRun.value, now.value))
  const timerText = computed(() => elapsed.value === null ? '' : formatElapsed(elapsed.value))
  const totals = computed(() => runTotals(activeRun.value))

  function updateRun (value) {
    activeRun.value = value
    if (value?.kind === 'story') storyRun.value = value
    now.value = Date.now()
  }
  const dialogue = useStoryDialogue(locale)
  const reduced = ref(saved.reduced)
  const panel = ref('')
  const pageActive = ref(import.meta.env.DEV || (!document.hidden && document.hasFocus()))
  const awayPause = ref(false)
  const pressedKeys = new Set()
  // Menu preferences are independent of a story's teaching rules or a shared link's difficulty.
  const mode = ref(saved.mode)
  const challenge = ref(saved.challenge)
  const guidance = ref(saved.guidance)
  const view = computed(() => route.name)
  useGameplayGestures(computed(() => view.value === 'puzzle'))

  const activeCode = ref('')
  const failure = ref(null)
  const notice = ref('')
  const fallbackText = ref('')
  const assisted = ref(false)
  const requested = ref('')
  const revealed = ref([])
  const boardTransitioning = ref(false)

  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  const systemReducedMotion = ref(mediaQuery.matches)
  // An explicit preference or the operating system can disable motion.
  const reducedMotion = computed(() => reduced.value || systemReducedMotion.value)
  const motionChanged = event => {
    systemReducedMotion.value = event.matches
  }
  const panelReturn = '/'

  const game = useSession({ reducedMotion: () => reducedMotion.value })
  const { level, state, chapter, solved } = game
  const session = reactive(game)
  const help = reactive(useAssistance(level, state, () => {
    assisted.value = true
    audio.play('hint')
  }))

  // Keep the country code visible when neither a localized nor an English name is available.
  const name = country => countries[country]?.names[locale.value] ?? countries[country]?.names.en ?? country
  const resumeCode = computed(() => resumeStory(completed.value, pendingStory.value))

  const canAutoPause = computed(() => view.value === 'puzzle' && activeCode.value === route.params.code &&
    Boolean(activeCode.value) && !game.loading.value && !boardTransitioning.value && !failure.value &&
    !panel.value && !dialogue.scene.value && !fallbackText.value && !solved.value && !storyFinished.value)

  function releaseKey (event) {
    pressedKeys.delete(event.code || event.key)
  }

  function pageActivityChanged () {
    if (import.meta.env.DEV) {
      pageActive.value = true
      return
    }

    pageActive.value = !document.hidden && document.hasFocus()
    if (!pageActive.value) pressedKeys.clear()
  }

  // Block play immediately, but only mount the native pause dialog on return.
  // showModal() must not try to focus a control while the browser is inactive.
  watch([pageActive, canAutoPause], ([active, ready]) => {
    if (!ready) {
      // Another modal or a completed board already owns the player's attention.
      if (panel.value || dialogue.scene.value || solved.value || storyFinished.value || failure.value) {
        awayPause.value = false
      }
      return
    }
    if (!active) {
      awayPause.value = true
      audio.stopEffects()
    } else if (awayPause.value) {
      awayPause.value = false
      panel.value = 'pause'
    }
  }, { flush: 'sync' })

  function focusBoard () {
    // Wait for routed/panel DOM updates, then avoid stealing focus from an active overlay or transition.
    nextTick(() => {
      if (!pageActive.value || awayPause.value || document.hidden || !document.hasFocus()) return
      if (boardTransitioning.value || game.loading.value || panel.value || dialogue.scene.value) return

      document.querySelector('.board-wrap')?.focus({ preventScroll: true })
    })
  }

  function setBoardTransitioning (value) {
    boardTransitioning.value = value
    if (!value) focusBoard()
  }

  function puzzleURL () {
    const resolved = router.resolve(puzzleLocation(chapter.value ? storyCode(1) : level.value.id, guidance.value))

    return new URL(resolved.href, window.location.href).href
  }

  function startDialogue (code, phase, onDone) {
    if (speedrun.value) {
      onDone?.()
      return
    }
    dialogue.start(code, phase, onDone)
  }

  async function activate (input, navigate = true) {
    if (game.loading.value) game.cancel()

    const destination = guardedPuzzleLocation(input, guidance.value)
    if (destination.name === 'home') {
      await router.replace({ name: 'home' })
      return false
    }
    const code = destination.params.code

    failure.value = null
    awayPause.value = false
    panel.value = ''
    dialogue.cancel()
    audio.stopEffects()

    try {
      if (!await game.start(code)) return false

      // Reset discoveries and assistance only after the replacement board is ready.
      if (storyIndex(code)) {
        guidance.value = storyGuidance(code)
        if (!storyRun.value || (storyIndex(code) === 1 &&
          (storyRun.value.finishedAt !== null || storyIndex(storyRun.value.code) !== 1))) {
          storyRun.value = createRun(code, speedrun.value)
        }
        updateRun(storyRun.value)
      } else {
        updateRun(createRun(code, speedrun.value))
      }
      storyFinished.value = false
      assisted.value = false
      revealed.value = []
      requested.value = ''
      notice.value = ''
      fallbackText.value = ''
      activeCode.value = code

      // Publish the active code before navigation so the route watcher can reuse this session.
      if (navigate) await router.push(puzzleLocation(code, guidance.value))

      window.scrollTo(0, 0)

      if (storyIndex(code)) {
        const resumingDialogue = pendingStory.value &&
          pendingStory.value === code

        if (resumingDialogue) {
          // The puzzle was solved before leaving. Resume its unread scene, then travel on.
          playAfterStory(code)
        } else if (
          storyIndex(code) === STORY_COUNT &&
          activeRun.value?.finishedAt !== null &&
          activeRun.value?.levels[code]
        ) {
          storyFinished.value = true
        } else {
          startDialogue(code, 'before', focusBoard)
        }
      } else {
        focusBoard()
      }

      return true
    } catch (error) {
      const key = error.code === 'MAP_LOAD_FAILED' ? 'errorMap' : 'errorLevel'
      const location = router.resolve(puzzleLocation(code, guidance.value))
      const url = new URL(location.href, window.location.href).href
      const report = `GeoSokoban prototype
Puzzle: ${code}
Link: ${url}
${error.name}: ${error.message}`
      failure.value = { key, code, report }
      fallbackText.value = ''
      notice.value = ''
      console.error('Puzzle preparation failed', error)

      return false
    }
  }

  function open (code) {
    // Only an explicit menu launch uses the preferred difficulty. Deep links keep their own settings.
    if (!storyIndex(code)) guidance.value = challengeSettings(challenge.value).guidance

    // Starting a completed campaign begins a fresh three-tour journey.
    if (storyIndex(code) === 1 && completed.value.length === STORY_COUNT && !pendingStory.value) {
      completed.value = []
      storyRun.value = null
    }

    return activate(code)
  }

  function cancelGeneration () {
    game.cancel()
    failure.value = null

    // A cancelled direct link has no matching board to show at its current URL.
    if (view.value === 'puzzle' && route.params.code !== activeCode.value) router.replace({ name: 'home' })

    nextTick(() => {
      if (view.value === 'puzzle') focusBoard()
      else document.querySelector('.start-game')?.focus({ preventScroll: true })
    })
  }

  function home () {
    audio.stopEffects()
    dialogue.cancel()
    panel.value = ''
    game.cancel()
    help.clearHint()
    router.push({ name: 'home' })
    failure.value = null
    notice.value = ''
    fallbackText.value = ''
    window.scrollTo(0, 0)
  }

  function showPanel (name) {
    if (dialogue.scene.value || game.loading.value || boardTransitioning.value) return
    if (!['pause', 'options', 'credits'].includes(name)) return

    panel.value = name
  }

  function closePanel () {
    if (panel.value) {
      // In-game options and credits return to Pause; closing Pause returns to the board.
      panel.value = panel.value !== 'pause' && view.value === 'puzzle' ? 'pause' : ''

      if (!panel.value) {
        // The pause menu owns its inline copy fallback; leaving it must not open a second share dialog.
        fallbackText.value = ''
        focusBoard()
      }

      return
    }

    // Standalone panel routes return home without sending the player to an unrelated history entry.
    if (router.options.history.state.back === panelReturn) router.back()
    else router.replace(panelReturn)
  }

  function hasDeliveredFlag (goal) {
    // A destination is complete only when occupied by its own country's flag.
    return state.value.boxes.some(box => box.country === goal.country && box.position === goal.position)
  }

  function step (direction) {
    if (!pageActive.value || awayPause.value) return
    // During navigation the route can name a board that has not replaced the old session yet.
    if (failure.value || view.value !== 'puzzle' || activeCode.value !== route.params.code) return
    if (boardTransitioning.value || panel.value || dialogue.scene.value || storyFinished.value) return
    if (game.loading.value || solved.value) return

    const previousState = state.value
    const deliveredCountries = level.value.goals.filter(hasDeliveredFlag).map(goal => goal.country)
    const previouslyDelivered = new Set(deliveredCountries)
    if (!game.step(direction)) {
      audio.play('blocked')
      return
    }

    // Only accepted actions are audible; snapshots restored by undo must not celebrate old deliveries.
    audio.play(movementSound(level.value, previousState, state.value))

    notice.value = ''
    fallbackText.value = ''

    // A newly delivered flag reveals its destination for the rest of this attempt.
    const arrived = level.value.goals.find(goal => !previouslyDelivered.has(goal.country) && hasDeliveredFlag(goal))

    if (arrived) {
      revealed.value = [...new Set([...revealed.value, arrived.country])]
    }

    if (solved.value) recordCompletion()
  }

  function recordCompletion () {
    updateRun(finishRunLevel(activeRun.value, level.value.id, state.value, assisted.value))
    if (!chapter.value) return
    const storyId = level.value.id
    completed.value = [...new Set([...completed.value, storyId])]
    // Save separately so an unread scene, including the ending, survives a reload.
    pendingStory.value = storyId
  }

  function undo () {
    if (!pageActive.value || awayPause.value || panel.value) return
    if (boardTransitioning.value || dialogue.scene.value || storyFinished.value) return

    if (game.undo()) {
      audio.play('undo')
      clearUndoneCheckpoint()
    }

    notice.value = ''
    focusBoard()
  }

  function restart () {
    if (!pageActive.value || awayPause.value || panel.value) return
    if (boardTransitioning.value || dialogue.scene.value || storyFinished.value) return

    if (game.restart()) {
      audio.play('restart')
      clearUndoneCheckpoint()
    }
    help.clearHint()

    notice.value = ''
    fallbackText.value = ''
    focusBoard()
  }

  function key (event) {
    if (!pageActive.value || awayPause.value || panel.value || dialogue.scene.value) return
    // A key held while leaving the page must be released before it can move again.
    const signature = event.code || event.key
    if (event.repeat && !pressedKeys.has(signature)) return
    if (!event.repeat) pressedKeys.add(signature)

    // Leave shortcuts, composed text and editing controls to the browser or focused field.
    if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return

    const editingField = event.target.closest('input, select, textarea, [contenteditable=true]')
    if (editingField) return

    const keys = {
      ArrowUp: 'up',
      ArrowRight: 'right',
      ArrowDown: 'down',
      ArrowLeft: 'left',
      w: 'up',
      d: 'right',
      s: 'down',
      a: 'left'
    }
    const direction = keys[event.key] ?? keys[event.key.toLowerCase()]

    if (direction) {
      event.preventDefault()
      step(direction)
    } else if (event.key.toLowerCase() === 'z') {
      event.preventDefault()
      undo()
    } else if (event.key.toLowerCase() === 'r') {
      event.preventDefault()
      restart()
    }
  }

  function inspect () {
    requested.value = ''
    if (guidance.value === 'remember') assisted.value = true
  }

  function selectDestination (country) {
    requested.value = country
  }

  function reveal (country) {
    requested.value = ''
    revealed.value = [...new Set([...revealed.value, country])]
    assisted.value = true
  }

  function setMode (value) {
    if (['story', 'daily', 'archive'].includes(value)) mode.value = value
  }

  function setChallenge (value) {
    if (CHALLENGES.includes(value)) challenge.value = value
  }

  async function copyText (text) {
    try {
      await navigator.clipboard.writeText(text)
      notice.value = t('copied')
      fallbackText.value = ''
    } catch {
      // Keep the exact text available for manual copying when clipboard access fails.
      fallbackText.value = text
      notice.value = t('copyFallback')
    }
  }

  let sharing = false

  async function sendShare (data) {
    // Repeated taps must not launch a second chooser or copy while the first chooser is still open.
    if (sharing) return

    sharing = true
    notice.value = ''
    fallbackText.value = ''
    const sharedCode = activeCode.value

    try {
      // Call immediately, before awaiting any work, to retain the button's user activation.
      const result = await shareResult(data)

      // A delayed platform response must not put old sharing feedback on another page or puzzle.
      if (view.value !== 'puzzle' || activeCode.value !== sharedCode) return

      if (result.status === 'copied') {
        notice.value = t('copied')
      } else if (result.status === 'fallback') {
        fallbackText.value = result.text
      }
    } finally {
      sharing = false
    }
  }

  function getStatsLine ({ moves, isAssisted, stops }) {
    const parts = [
      stops ? t('stopsCount', stops) : null,
      t('movesCount', moves),
      timerText.value ? `⏱️ ${timerText.value}` : null,
      isAssisted ? `💡 ${t('assisted')}` : `✨ ${t('unassisted')}`
    ]

    return parts.filter(Boolean).join(' · ')
  }

  function getShareText () {
    const result = totals.value
    const isAssisted = Boolean(chapter.value ? result.assisted : assisted.value)

    // Story Mode
    if (chapter.value) {
      const stats = getStatsLine({
        stops: result.levels,
        moves: result.moves,
        isAssisted
      })
      return t('shareStoryResult', { stats })
    }

    // Daily vs Archive / Past Puzzles
    const isDaily = puzzleDate(level.value.id) === utcDay()
    const key = isDaily ? 'shareDailyResult' : 'shareDatedResult'
    const challenge = t('challenge' + challengeName(guidance.value, level.value.planning === true))

    const stats = getStatsLine({
      moves: state.value.moves,
      isAssisted
    })

    return t(key, {
      date: puzzleDate(level.value.id) ?? '',
      challenge,
      stats
    })
  }

  async function share () {
    if (chapter.value && !storyFinished.value) return

    return sendShare({
      title: 'GeoSokoban',
      text: getShareText(),
      url: puzzleURL()
    })
  }

  function clearUndoneCheckpoint () {
    // Restart is undoable: restoring a solved snapshot must finish the clock again.
    if (solved.value) {
      recordCompletion()
      return
    }
    if (!solved.value) {
      storyFinished.value = false
      updateRun(reopenRunLevel(activeRun.value, level.value.id))
      const current = level.value.id
      if (current) completed.value = completed.value.filter(code => code !== current)
    }
    // Undo/restart after solving is a return to play, not a pending departure.
    if (!solved.value && pendingStory.value === level.value.id) {
      pendingStory.value = ''
    }
  }

  function travelAfterStory (code) {
    const index = storyIndex(code)
    if (!index) return

    pendingStory.value = ''

    if (index === STORY_COUNT) {
      storyFinished.value = true
      return
    }

    open(storyCode(index + 1))
  }

  function playAfterStory (code) {
    // Missing/empty scenes continue immediately; authored scenes own the departure until dismissed.
    startDialogue(code, 'after', () => travelAfterStory(code))
  }

  function nextPuzzle () {
    if (game.loading.value || boardTransitioning.value || dialogue.scene.value) return

    if (chapter.value) {
      if (!solved.value) return

      playAfterStory(level.value.id)
      return
    }

    setMode('archive')
    router.push({ name: 'home', query: { date: puzzleDate(level.value.id) ?? utcDay() } })
  }

  function clearProgress () {
    completed.value = []
    pendingStory.value = ''
    storyRun.value = null
  }

  function retry () {
    const code = failure.value?.code
    if (code) return activate(code, route.name !== 'puzzle' || route.params.code !== code)
  }

  watch(() => route.fullPath, async () => {
    awayPause.value = false
    // Route changes supersede pending preparation even when the new route is not a puzzle.
    game.cancel()
    audio.stopEffects()
    panel.value = ''
    failure.value = null
    notice.value = ''

    if (route.name !== 'puzzle') {
      dialogue.cancel()
      boardTransitioning.value = false
      return
    }

    const destination = guardedPuzzleLocation(route.params.code, route.query.g)
    if (destination.name === 'home') {
      dialogue.cancel()
      await router.replace({ name: 'home' })
      return
    }
    const code = normalizeCode(destination.params.code)

    // Story follows its tour; dated puzzles take guidance from their own shareable link.
    const rememberTargets = isPlanningCode(code) || route.query.g === 'remember'
    guidance.value = storyGuidance(code) ?? (rememberTargets ? 'remember' : 'learn')

    // A guidance-only URL change must not restart the current puzzle or discard its history.
    if (activeCode.value === code) {
      if (pendingStory.value && pendingStory.value === code) {
        playAfterStory(code)
      }
      focusBoard()
      return
    }

    dialogue.cancel()
    await activate(code, false)
  }, { immediate: true })

  // Dialogue and menus need reading space, but the music loop should not restart on every panel change.
  watch([panel, dialogue.scene], ([panelName, scene]) => {
    audio.setQuiet(Boolean(panelName || scene))
    if (panelName || scene) pressedKeys.clear()
  })

  // Audio choices share the existing save so they survive reloads without erasing story progress.
  watch([
    locale, completed, pendingStory, reduced, mode, challenge, speedrun, storyRun,
    () => audio.music, () => audio.sfx, () => audio.musicVolume, () => audio.sfxVolume
  ], () => {
    savePreferences({
      locale: locale.value,
      completed: completed.value,
      pendingStory: pendingStory.value,
      speedrun: speedrun.value,
      storyRun: storyRun.value,
      reduced: reduced.value,
      mode: mode.value,
      challenge: challenge.value,
      music: audio.music,
      sfx: audio.sfx,
      musicVolume: audio.musicVolume,
      sfxVolume: audio.sfxVolume
    })
    document.documentElement.lang = locale.value
  })

  watch(locale, () => {
    notice.value = ''
  })

  let clockTimer
  onMounted(() => {
    clockTimer = setInterval(() => {
      now.value = Date.now()
    }, 200)
    document.documentElement.lang = locale.value
    mediaQuery.addEventListener('change', motionChanged)
    window.addEventListener('blur', pageActivityChanged)
    window.addEventListener('focus', pageActivityChanged)
    window.addEventListener('keyup', releaseKey)
    document.addEventListener('visibilitychange', pageActivityChanged)
    pageActivityChanged()
  })

  let noticeTimer

  watch(notice, value => {
    // Replace the old expiry so a previous notice cannot erase a newer one early.
    clearTimeout(noticeTimer)
    if (value && view.value === 'puzzle') {
      noticeTimer = setTimeout(() => {
        notice.value = ''
      }, 2800)
    }
  })

  onUnmounted(() => {
    clearTimeout(noticeTimer)
    clearInterval(clockTimer)
    dialogue.cancel()
    mediaQuery.removeEventListener('change', motionChanged)
    window.removeEventListener('blur', pageActivityChanged)
    window.removeEventListener('focus', pageActivityChanged)
    window.removeEventListener('keyup', releaseKey)
    document.removeEventListener('visibilitychange', pageActivityChanged)
  })

  return {
    audio,
    speedrun,
    timerText,
    totals,
    storyFinished,
    view,
    locale,
    completed,
    reduced,
    panel,
    guidance,
    mode,
    challenge,
    notice,
    fallbackText,
    requested,
    revealed,
    reducedMotion,
    boardTransitioning,
    activeCode,
    failure,
    session,
    help,
    resumeCode,
    storyScene: dialogue.scene,
    finishStory: dialogue.finish,
    clearProgress,
    t,
    name,
    open,
    home,
    showPanel,
    closePanel,
    cancelGeneration,
    retry,
    copyFailure: () => copyText(failure.value.report),
    step,
    key,
    undo,
    restart,
    inspect,
    selectDestination,
    reveal,
    setMode,
    setChallenge,
    nextPuzzle,
    share,
    copyText,
    setBoardTransitioning,
    dismissShare: () => {
      fallbackText.value = ''
    }
  }
}
