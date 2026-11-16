import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { puzzleLocation } from '../router/locations.js'
import { shareResult } from '../core/share.js'
import { useStoryDialogue } from './useStoryDialogue.js'
import { resumeStory, storyProgressCode } from '../content/story.js'
import { useSession } from './useSession.js'
import { useAssistance } from './useAssistance.js'
import { normalizeCode, newCode, isPlanningCode } from '../core/seed.js'
import { CHALLENGES, challengeSettings, challengeName, withPlanning } from '../core/challenge.js'
import { storyCode, storyIndex, STORY_COUNT } from '../content/regions.js'
import relations from '../content/relations.json' with { type: 'json' }
import { translate, countryName } from '../data/i18n.js'
import { readPreferences, savePreferences } from '../ui/storage.js'

export function useGameController () {
  const router = useRouter()
  const route = useRoute()
  const saved = readPreferences()
  const detected = navigator.language.startsWith('pt')
    ? 'pt-BR'
    : navigator.language.startsWith('es') ? 'es' : 'en'

  const locale = ref(saved.locale ?? detected)
  const completed = ref(saved.completed)
  const pendingStory = ref(saved.pendingStory)
  const dialogue = useStoryDialogue(locale)
  const reduced = ref(saved.reduced)
  const panel = ref('')
  const guidance = ref(saved.guidance)
  const planning = ref(saved.planning)
  const challenge = computed(() => challengeName(guidance.value, planning.value))
  const view = computed(() => route.name)

  const activeCode = ref('')
  const failure = ref(null)
  const notice = ref('')
  const fallbackText = ref('')
  const assisted = ref(false)
  const selected = ref('')
  const requested = ref('')
  const revealed = ref([])
  const factCountry = ref('')
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
  }))

  const t = (key, params) => translate(locale.value, key, params)
  const name = country => countryName(country, locale.value)
  const resumeCode = computed(() => resumeStory(completed.value, pendingStory.value))

  const fact = computed(() => {
    if (!factCountry.value) return ''

    const relation = relations[factCountry.value]
    if (!relation) return t('findCountry', { country: name(factCountry.value) })

    const country = name(factCountry.value)
    const directionKey = 'geo' + relation[0][0].toUpperCase() + relation[0].slice(1)
    const direction = t(directionKey)
    const other = name(relation[1])

    return t('relation', { country, direction, other })
  })

  function focusBoard () {
    // Wait for routed/panel DOM updates, then avoid stealing focus from an active overlay or transition.
    nextTick(() => {
      if (boardTransitioning.value || game.loading.value || panel.value || dialogue.scene.value) return

      document.querySelector('.board-wrap:not(.board-preview)')?.focus({ preventScroll: true })
    })
  }

  function setBoardTransitioning (value) {
    boardTransitioning.value = value
    if (!value) focusBoard()
  }

  function puzzleURL () {
    const resolved = router.resolve(puzzleLocation(level.value.id, guidance.value))

    return new URL(resolved.href, window.location.href).href
  }

  async function activate (input, navigate = true) {
    if (game.loading.value) game.cancel()

    const code = normalizeCode(input)

    if (!code) {
      notice.value = t('errorCode')
      if (!navigate) failure.value = { key: 'errorCode', code: null }
      return false
    }

    failure.value = null
    panel.value = ''
    dialogue.cancel()

    try {
      if (!await game.start(code)) return false

      // Reset discoveries and assistance only after the replacement board is ready.
      planning.value = level.value.planning === true
      assisted.value = false
      revealed.value = []
      selected.value = guidance.value === 'learn' ? level.value.goals[0].country : ''
      requested.value = ''
      factCountry.value = ''
      notice.value = ''
      fallbackText.value = ''
      activeCode.value = code

      // Publish the active code before navigation so the route watcher can reuse this session.
      if (navigate) await router.push(puzzleLocation(code, guidance.value))

      window.scrollTo(0, 0)

      if (storyIndex(code)) {
        const resumingDialogue = pendingStory.value &&
          storyProgressCode(pendingStory.value) === storyProgressCode(code)

        if (resumingDialogue) {
          // The puzzle was solved before leaving. Resume its unread scene, then travel on.
          playAfterStory(code)
        } else {
          dialogue.start(code, 'before', focusBoard)
        }
      } else {
        focusBoard()
      }

      return true
    } catch (error) {
      failure.value = { key: error.code === 'MAP_LOAD_FAILED' ? 'errorMap' : 'errorLevel', code }
      console.error('Puzzle preparation failed', error)

      return false
    }
  }

  function open (code) {
    // Starting a completed campaign begins a fresh three-tour journey.
    if (storyIndex(code) === 1 && completed.value.length === STORY_COUNT && !pendingStory.value) {
      completed.value = []
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
    // During navigation the route can name a board that has not replaced the old session yet.
    if (view.value !== 'puzzle' || activeCode.value !== route.params.code) return
    if (boardTransitioning.value || panel.value || dialogue.scene.value) return

    const deliveredCountries = level.value.goals.filter(hasDeliveredFlag).map(goal => goal.country)
    const previouslyDelivered = new Set(deliveredCountries)
    if (!game.step(direction)) return

    notice.value = ''
    fallbackText.value = ''

    // Reveal facts only for a new arrival, not for flags already resting on their destinations.
    const arrived = level.value.goals.find(goal => !previouslyDelivered.has(goal.country) && hasDeliveredFlag(goal))

    if (arrived) {
      factCountry.value = arrived.country
      revealed.value = [...new Set([...revealed.value, arrived.country])]
    }

    if (solved.value && chapter.value) {
      // Hard and non-Hard versions count toward the same story chapter.
      const storyId = storyProgressCode(level.value.id)
      completed.value = [...new Set([...completed.value, storyId])]
      // Save this separately from puzzle completion so the closing scene survives a reload.
      pendingStory.value = level.value.id
    }
  }

  function undo () {
    if (boardTransitioning.value || dialogue.scene.value) return

    game.undo()
    clearUndoneCheckpoint()
    factCountry.value = ''
    notice.value = ''
    focusBoard()
  }

  function restart () {
    if (boardTransitioning.value || dialogue.scene.value) return

    game.restart()
    clearUndoneCheckpoint()
    help.clearHint()
    factCountry.value = ''
    notice.value = ''
    fallbackText.value = ''
    focusBoard()
  }

  function key (event) {
    if (dialogue.scene.value) return

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

  function inspect (country) {
    requested.value = ''
    factCountry.value = country
    if (guidance.value === 'remember') assisted.value = true
  }

  function selectDestination (country) {
    requested.value = country

    // In Remember mode, asking for a hidden destination is not itself permission to reveal it.
    if (guidance.value === 'learn' || revealed.value.includes(country)) {
      selected.value = country
      factCountry.value = country
    }
  }

  function reveal (country) {
    requested.value = ''
    revealed.value = [...new Set([...revealed.value, country])]
    selected.value = country
    factCountry.value = country
    assisted.value = true
  }

  function revealAll () {
    revealed.value = level.value.goals.map(goal => goal.country)
    assisted.value = true
  }

  function setGuidance (value) {
    if (guidance.value === value) return

    if (view.value === 'puzzle') assisted.value = true
    guidance.value = value
    if (view.value === 'puzzle') router.replace(puzzleLocation(level.value.id, value))
  }

  function setChallenge (value) {
    if (!CHALLENGES.includes(value)) return

    const settings = challengeSettings(value)
    guidance.value = settings.guidance
    planning.value = settings.planning
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

      if (result.status === 'copied') notice.value = t('copied')
      else if (result.status === 'fallback') fallbackText.value = result.text
    } finally {
      sharing = false
    }
  }

  function sharePuzzle () {
    // Sharing an unfinished puzzle is an invitation, not a result with a misleading move count.
    return sendShare({ title: 'GeoSokoban', url: puzzleURL() })
  }

  async function share () {
    const moves = state.value.moves
    // Report the loaded board's planning mode, not a preference selected for a future puzzle.
    const challengeLabel = t('challenge' + challengeName(guidance.value, level.value.planning === true))
    const assistanceLabel = t(assisted.value ? 'assisted' : 'unassisted')
    const resultText = t('shareResult', { moves, challenge: challengeLabel, help: assistanceLabel })
    const text = `${resultText}\n${level.value.id}`

    return sendShare({ title: 'GeoSokoban', text, url: puzzleURL() })
  }

  function clearUndoneCheckpoint () {
    // Undo/restart after solving is a return to play, not a pending departure.
    if (!solved.value && storyProgressCode(pendingStory.value) === storyProgressCode(level.value.id)) {
      pendingStory.value = ''
    }
  }

  function travelAfterStory (code) {
    const index = storyIndex(code)
    if (!index) return

    pendingStory.value = ''

    if (index === STORY_COUNT) {
      home()
      return
    }

    open(withPlanning(storyCode(index + 1), isPlanningCode(code)))
  }

  function playAfterStory (code) {
    // Missing/empty scenes continue immediately; authored scenes own the departure until dismissed.
    dialogue.start(code, 'after', () => travelAfterStory(code))
  }

  function nextPuzzle () {
    if (game.loading.value || boardTransitioning.value || dialogue.scene.value) return

    if (chapter.value) {
      if (!solved.value) return

      playAfterStory(level.value.id)
      return
    }

    open(withPlanning(newCode(), level.value.planning === true))
  }

  function clearProgress () {
    completed.value = []
    pendingStory.value = ''
  }

  function retry () {
    const code = failure.value?.code
    if (code) return activate(code, route.name !== 'puzzle' || route.params.code !== code)
  }

  watch(() => route.fullPath, async () => {
    // Route changes supersede pending preparation even when the new route is not a puzzle.
    game.cancel()
    panel.value = ''
    failure.value = null
    notice.value = ''

    if (route.name !== 'puzzle') {
      dialogue.cancel()
      boardTransitioning.value = false
      return
    }

    const code = normalizeCode(route.params.code)

    if (!code) {
      dialogue.cancel()
      failure.value = { key: 'errorCode', code: null }
      return
    }

    // Hard always hides destinations; other boards take guidance from the shareable query parameter.
    const rememberTargets = isPlanningCode(code) || route.query.g === 'remember'
    guidance.value = rememberTargets ? 'remember' : 'learn'

    // A guidance-only URL change must not restart the current puzzle or discard its history.
    if (activeCode.value === code) {
      focusBoard()
      return
    }

    dialogue.cancel()
    await activate(code, false)
  }, { immediate: true })

  watch([locale, completed, pendingStory, reduced, guidance, planning], () => {
    savePreferences({
      locale: locale.value,
      completed: completed.value,
      pendingStory: pendingStory.value,
      reduced: reduced.value,
      guidance: guidance.value,
      planning: planning.value
    })
    document.documentElement.lang = locale.value
  })

  watch(locale, () => {
    notice.value = ''
  })

  onMounted(() => {
    document.documentElement.lang = locale.value
    mediaQuery.addEventListener('change', motionChanged)
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
    dialogue.cancel()
    mediaQuery.removeEventListener('change', motionChanged)
  })

  return {
    view,
    locale,
    completed,
    reduced,
    panel,
    guidance,
    challenge,
    notice,
    fallbackText,
    assisted,
    selected,
    requested,
    revealed,
    fact,
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
    step,
    key,
    undo,
    restart,
    inspect,
    selectDestination,
    reveal,
    revealAll,
    setGuidance,
    setChallenge,
    nextPuzzle,
    share,
    sharePuzzle,
    copyText,
    puzzleURL,
    setBoardTransitioning,
    dismissShare: () => {
      fallbackText.value = ''
    }
  }
}
