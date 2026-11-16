import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { puzzleLocation } from '../router/locations.js'
import { shareResult } from '../core/share.js'
import { useSession } from './useSession.js'
import { useAssistance } from './useAssistance.js'
import { normalizeCode, newCode } from '../core/seed.js'
import { CHALLENGES, challengeSettings, challengeName, withPlanning } from '../core/challenge.js'
import { storyCode, STORY_COUNT } from '../content/regions.js'
import relations from '../content/relations.json' with { type: 'json' }
import { translate, countryName } from '../data/i18n.js'
import { readPreferences, savePreferences } from '../ui/storage.js'

export function useGameController () {
  const router = useRouter()
  const route = useRoute()
  const saved = readPreferences()
  const detected = navigator.language.startsWith('pt') ? 'pt-BR' : navigator.language.startsWith('es') ? 'es' : 'en'
  const locale = ref(saved.locale ?? detected)
  const completed = ref(saved.completed)
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
  const reducedMotion = computed(() => reduced.value || systemReducedMotion.value)
  const motionChanged = event => { systemReducedMotion.value = event.matches }
  const panelReturn = '/'
  const game = useSession({ reducedMotion: () => reducedMotion.value })
  const { level, state, chapter, solved } = game
  const session = reactive(game)
  const help = reactive(useAssistance(level, state, () => { assisted.value = true }))
  const t = (key, params) => translate(locale.value, key, params)
  const name = country => countryName(country, locale.value)
  const resumeCode = computed(() => Array.from({ length: STORY_COUNT }, (_, index) => storyCode(index + 1)).find(code => !completed.value.includes(code)) ?? storyCode(1))
  const fact = computed(() => {
    if (!factCountry.value) return ''
    const relation = relations[factCountry.value]
    return relation ? t('relation', { country: name(factCountry.value), direction: t('geo' + relation[0][0].toUpperCase() + relation[0].slice(1)), other: name(relation[1]) })
      : t('findCountry', { country: name(factCountry.value) })
  })

  function focusBoard () {
    nextTick(() => {
      if (!boardTransitioning.value && !game.loading.value && !panel.value) document.querySelector('.board-wrap:not(.board-preview)')?.focus({ preventScroll: true })
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
    try {
      if (!await game.start(code)) return false
      planning.value = level.value.planning === true
      assisted.value = false
      revealed.value = []
      selected.value = guidance.value === 'learn' ? level.value.goals[0].country : ''
      requested.value = ''
      factCountry.value = ''
      notice.value = ''
      fallbackText.value = ''
      activeCode.value = code
      if (navigate) await router.push(puzzleLocation(code, guidance.value))
      window.scrollTo(0, 0)
      focusBoard()
      return true
    } catch (error) {
      failure.value = { key: error.code === 'MAP_LOAD_FAILED' ? 'errorMap' : 'errorLevel', code }
      console.error('Puzzle preparation failed', error)
      return false
    }
  }

  function open (code) {
    return activate(code)
  }

  function cancelGeneration () {
    game.cancel()
    failure.value = null
    if (view.value === 'puzzle' && route.params.code !== activeCode.value) router.replace({ name: 'home' })
    nextTick(() => {
      if (view.value === 'puzzle') focusBoard()
      else document.querySelector('.start-game')?.focus({ preventScroll: true })
    })
  }

  function home () {
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
    if (game.loading.value || boardTransitioning.value || !['pause', 'options', 'credits'].includes(name)) return
    panel.value = name
  }

  function closePanel () {
    if (panel.value) {
      panel.value = panel.value !== 'pause' && view.value === 'puzzle' ? 'pause' : ''
      if (!panel.value) focusBoard()
      return
    }
    if (router.options.history.state.back === panelReturn) router.back()
    else router.replace(panelReturn)
  }

  function step (direction) {
    if (view.value !== 'puzzle' || activeCode.value !== route.params.code || boardTransitioning.value || panel.value) return
    const before = new Set(level.value.goals.filter(goal => state.value.boxes.some(box => box.country === goal.country && box.position === goal.position)).map(goal => goal.country))
    if (!game.step(direction)) return
    notice.value = ''
    fallbackText.value = ''
    const arrived = level.value.goals.find(goal => !before.has(goal.country) && state.value.boxes.some(box => box.country === goal.country && box.position === goal.position))
    if (arrived) {
      factCountry.value = arrived.country
      revealed.value = [...new Set([...revealed.value, arrived.country])]
    }
    if (solved.value && chapter.value) completed.value = [...new Set([...completed.value, level.value.id.replace(/-P$/, '')])]
  }

  function undo () {
    if (boardTransitioning.value) return
    game.undo()
    factCountry.value = ''
    notice.value = ''
    focusBoard()
  }

  function restart () {
    if (boardTransitioning.value) return
    game.restart()
    help.clearHint()
    factCountry.value = ''
    notice.value = ''
    fallbackText.value = ''
    focusBoard()
  }

  function key (event) {
    if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing || event.target.closest('input, select, textarea, [contenteditable=true]')) return
    const keys = { ArrowUp: 'up', ArrowRight: 'right', ArrowDown: 'down', ArrowLeft: 'left', w: 'up', d: 'right', s: 'down', a: 'left' }
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
      fallbackText.value = text
      notice.value = t('copyFallback')
    }
  }

  async function share () {
    const text = t('shareResult', { code: level.value.id, moves: state.value.moves, challenge: t('challenge' + challengeName(guidance.value, level.value.planning === true)), help: t(assisted.value ? 'assisted' : 'unassisted') })
    const result = await shareResult({ title: 'GeoSokoban', text, url: puzzleURL() })
    if (result.status === 'fallback') fallbackText.value = result.text
  }

  function nextPuzzle () {
    if (game.loading.value || boardTransitioning.value) return
    if (chapter.value === STORY_COUNT) {
      home()
      return
    }
    const code = withPlanning(chapter.value ? storyCode(chapter.value + 1) : newCode(), level.value.planning === true)
    open(code)
  }

  function retry () {
    const code = failure.value?.code
    if (code) return activate(code, route.name !== 'puzzle' || route.params.code !== code)
  }

  watch(() => route.fullPath, async () => {
    game.cancel()
    panel.value = ''
    failure.value = null
    notice.value = ''
    if (route.name !== 'puzzle') {
      boardTransitioning.value = false
      return
    }
    const code = normalizeCode(route.params.code)
    if (!code) {
      failure.value = { key: 'errorCode', code: null }
      return
    }
    guidance.value = code.endsWith('-P') || route.query.g === 'remember' ? 'remember' : 'learn'
    if (activeCode.value === code) {
      focusBoard()
      return
    }
    await activate(code, false)
  }, { immediate: true })

  watch([locale, completed, reduced, guidance, planning], () => {
    savePreferences({ locale: locale.value, completed: completed.value, reduced: reduced.value, guidance: guidance.value, planning: planning.value })
    document.documentElement.lang = locale.value
  })
  watch(locale, () => { notice.value = '' })
  onMounted(() => {
    document.documentElement.lang = locale.value
    mediaQuery.addEventListener('change', motionChanged)
  })

  let noticeTimer
  watch(notice, value => {
    clearTimeout(noticeTimer)
    if (value && view.value === 'puzzle') noticeTimer = setTimeout(() => { notice.value = '' }, 2800)
  })
  onUnmounted(() => { clearTimeout(noticeTimer); mediaQuery.removeEventListener('change', motionChanged) })

  return {
    view, locale, completed, reduced, panel, guidance, challenge, notice, fallbackText,
    assisted, selected, requested, revealed, fact, reducedMotion, boardTransitioning, activeCode, failure,
    session, help, resumeCode, t, name, open, home, showPanel, closePanel,
    cancelGeneration, retry, step, key, undo, restart, inspect, selectDestination,
    reveal, revealAll, setGuidance, setChallenge, nextPuzzle, share, copyText,
    puzzleURL, setBoardTransitioning, dismissShare: () => { fallbackText.value = '' }
  }
}
