<script setup>
import { computed, ref, watch, nextTick, onBeforeUnmount } from 'vue'
import { regionById, storyStop, STORY_COUNT, STORY_TOURS } from '../content/regions.js'
import { boardTransitionDuration } from '../core/board-transition.js'
import { puzzleDate } from '../core/seed.js'
import { utcDay } from '../core/dates.js'
import { createCompletionSequence } from '../core/completion.js'
import GameBoard from './GameBoard.vue'
import LevelClear from './LevelClear.vue'
import HintPanel from './HintPanel.vue'
import OverlayDialog from './OverlayDialog.vue'
import FlagIcon from './FlagIcon.vue'
import ControlIcon from './ControlIcon.vue'

const props = defineProps({
  game: { type: Object, required: true },
  help: { type: Object, required: true },
  t: { type: Function, required: true },
  name: { type: Function, required: true },
  guidance: { type: String, required: true },
  revealed: { type: Array, required: true },
  selected: { type: String, default: '' },
  requested: { type: String, default: '' },
  notice: { type: String, default: '' },
  fact: { type: String, default: '' },
  fallbackText: { type: String, default: '' },
  timerText: { type: String, default: '' },
  totals: { type: Object, default: () => ({ levels: 0, moves: 0 }) },
  storyFinished: Boolean,
  assisted: Boolean,
  panelOpen: Boolean,
  reducedMotion: Boolean
})
const emit = defineEmits([
  'home', 'key', 'step', 'undo', 'restart', 'inspect', 'destination', 'reveal', 'revealAll',
  'guidance', 'next', 'share', 'copy', 'dismissShare', 'panel', 'transition'
])

const board = ref(null)
const isOverview = ref(false)
const transitioning = ref(false)
const transitionDuration = computed(() => boardTransitionDuration(props.reducedMotion))

function beginTransition () {
  // Lock input for the whole tile sweep, not just for an individual tile's animation.
  transitioning.value = !props.reducedMotion
  emit('transition', transitioning.value)
}

function finishTransition () {
  // Cancellation must release the same lock as a completed entry animation.
  transitioning.value = false
  emit('transition', false)
}

function toggleOverview () {
  board.value?.toggleOverview()
}

const visible = country => props.guidance === 'learn' || props.revealed.includes(country)
const regionName = computed(() => props.t(regionById(props.game.level.region).name))
const storyChapter = computed(() => storyStop(props.game.chapter))
const hintOpen = ref(false)
const victoryOpen = ref(true)
const phase = ref(props.game.solved ? 'results' : 'playing')
const delivery = ref(null)

// Completion owns the delay between solving, the clear banner, and the results dialog.
const sequence = createCompletionSequence(value => {
  phase.value = value
  // Story never stops at a per-level scoreboard: dialogue owns the next departure.
  if (value === 'results' && props.game.chapter && !props.storyFinished) emit('next')
})

let labelTimer = null
let labelRevision = 0

function clearLabel () {
  clearTimeout(labelTimer)
  delivery.value = null
}

function labelFlag (country) {
  const box = props.game.state.boxes.find(box => box.country === country)
  if (!box) return

  clearLabel()

  // A fresh key restarts the label animation even when the same flag is inspected twice.
  delivery.value = { country, position: box.position, id: ++labelRevision }
  labelTimer = setTimeout(() => {
    // Keep the final delivery label until the completion sequence replaces it with results.
    if (!props.game.solved) delivery.value = null
  }, 2800)
}

function inspect (country) {
  labelFlag(country)
  emit('inspect', country)
}

watch(() => props.game.level.id, () => {
  hintOpen.value = false
  victoryOpen.value = true
  clearLabel()
  sequence.reset()
})

watch(() => props.game.solved, value => {
  if (value) {
    hintOpen.value = false
    victoryOpen.value = true
    sequence.start()
  } else {
    // Undoing a solved board cancels any pending completion timer.
    clearLabel()
    sequence.reset()
  }
})

watch(() => props.game.state, (next, previous) => {
  if (!previous || next.moves <= previous.moves) {
    // Undo and restart are not new deliveries, even if a flag returns to a destination.
    clearLabel()
    return
  }

  const arrived = props.game.level.goals.find(goal => {
    const isDelivered = next.boxes.some(box => box.country === goal.country && box.position === goal.position)
    if (!isDelivered) return false

    const wasDelivered = previous.boxes.some(box => box.country === goal.country && box.position === goal.position)
    return !wasDelivered
  })

  if (arrived) {
    labelFlag(arrived.country)
  } else if (delivery.value) {
    const labeledFlagStillHere = next.boxes.some(box =>
      box.country === delivery.value.country && box.position === delivery.value.position)

    if (!labeledFlagStillHere) clearLabel()
  }
})

const labels = computed(() => {
  if (!delivery.value || phase.value === 'results') return []

  return [{ ...delivery.value, text: props.name(delivery.value.country) }]
})

const description = computed(() => {
  const { state, level } = props.game

  // Engine positions are zero-based row-major indices; spoken coordinates start at one.
  const at = position => ({
    row: Math.floor(position / level.width) + 1,
    column: position % level.width + 1
  })

  const playerDescription = props.t('position', at(state.player))
  const flagDescriptions = state.boxes.map(box => {
    const country = visible(box.country) ? props.name(box.country) : props.t('unknownFlag')
    return props.t('flagPosition', { country, ...at(box.position) })
  })
  const goalDescriptions = level.goals.map((goal, index) => {
    // Remember mode must conceal destinations in the spoken description as well as on the board.
    const country = visible(goal.country)
      ? props.name(goal.country)
      : props.t('destination', { n: index + 1 })

    return props.t('goalPosition', { country, ...at(goal.position) })
  })

  return [playerDescription, ...flagDescriptions, ...goalDescriptions].join(' ')
})

const resultDate = computed(() => puzzleDate(props.game.level.id))
const resultTitle = computed(() => props.game.chapter ? 'finish' : resultDate.value === utcDay() ? 'dailyComplete' : 'archiveComplete')
const resultMoves = computed(() => props.game.chapter ? props.totals.moves : props.game.state.moves)
const showVictory = computed(() => (props.storyFinished || (!props.game.chapter && props.game.solved && phase.value === 'results')) &&
  victoryOpen.value &&
  !props.fallbackText &&
  !props.panelOpen &&
  !transitioning.value)

function closeHint () {
  hintOpen.value = false
  props.help.clearHint()
}

function toggleHint () {
  if (hintOpen.value) {
    closeHint()
  } else {
    hintOpen.value = true
    if (!props.help.stage) props.help.request()
  }

  // The overlay changes the DOM; restore board keyboard control after that update.
  nextTick(() => document.querySelector('.board-wrap')?.focus({ preventScroll: true }))
}

function boardKey (event) {
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('panel', 'pause')
    return
  }

  emit('key', event)
}

onBeforeUnmount(() => {
  clearLabel()
  sequence.reset()
  finishTransition()
})
</script>

<template>
  <main
    class="play-page"
    :class="{ 'is-changing': transitioning }"
    :data-code="game.level.id"
    :data-completion="phase"
    :aria-busy="transitioning"
    :inert="transitioning || undefined"
  >
    <Transition
      name="board-swap"
      mode="out-in"
      appear
      :css="!reducedMotion"
      :duration="transitionDuration"
      @before-enter="beginTransition"
      @before-leave="beginTransition"
      @after-enter="finishTransition"
      @enter-cancelled="finishTransition"
      @leave-cancelled="finishTransition"
    >
      <GameBoard
        ref="board"
        :key="game.level.id"
        :level="game.level"
        :state="game.state"
        :facing="game.facing"
        :label="t('board')"
        :description="description"
        :labels="labels"
        :show-flags="guidance === 'learn'"
        :revealed="revealed"
        :overlay="help.overlay"
        @overview="isOverview = $event"
        @key="boardKey"
        @step="$emit('step', $event)"
        @inspect="inspect"
        @destination="$emit('destination', $event)"
      />
    </Transition>
    <header class="play-hud">
      <div>
        <p v-if="storyChapter" class="journey-hud">
          {{ t('worldTour', { n: storyChapter.tour, total: STORY_TOURS }) }}
        </p>
        <h1>{{ regionName }}</h1>
      </div>
      <div class="hud-stats">
        <span class="move-counter">{{ t('moves') }} <b>{{ game.state.moves }}</b></span>
        <span v-if="timerText" class="run-timer" :aria-label="t('speedrun')">
          ◷ {{ timerText }}
        </span>
      </div>
    </header>
    <Transition name="warning">
      <section v-if="help.warning && !game.solved" class="top-overlay deadlock-warning" role="status">
        <strong>{{ t('stuck') }}</strong>
        <div class="recovery-actions">
          <button class="button primary" aria-keyshortcuts="z" @click="$emit('undo')">
            <ControlIcon name="undo" />{{ t('undo') }} <kbd aria-hidden="true">Z</kbd>
          </button>
          <button class="button secondary" aria-keyshortcuts="r" @click="$emit('restart')">
            <ControlIcon name="restart" />{{ t('restart') }} <kbd aria-hidden="true">R</kbd>
          </button>
        </div>
      </section>
    </Transition>
    <div
      v-if="notice && !panelOpen && !showVictory && !fallbackText"
      class="utility-notice"
      role="status"
    >
      {{ notice }}
    </div>
    <div v-if="requested && !visible(requested)" class="geography-popover">
      <button class="button secondary" @click="$emit('reveal', requested)">
        {{ t('revealCountry') }}
      </button>
    </div>
    <Transition name="hint">
      <div v-if="hintOpen && !game.solved" class="hint-overlay">
        <HintPanel
          :help="help"
          :t="t"
          :name="name"
          :width="game.level.width"
          :solved="game.solved"
          @dismiss="closeHint"
        />
      </div>
    </Transition>
    <Transition name="hud">
      <nav
        v-show="!storyFinished && (!game.solved || (!game.chapter && phase === 'results'))"
        class="play-controls"
        :aria-label="t('controls')"
      >
        <button
          class="hud-button"
          :title="`${t('undo')} (Z)`"
          :aria-label="t('undo')"
          aria-keyshortcuts="z"
          :disabled="!game.historyCount"
          @click="$emit('undo')"
        >
          <ControlIcon name="undo" />
        </button>
        <button
          class="hud-button"
          :title="`${t('restart')} (R)`"
          :aria-label="t('restart')"
          aria-keyshortcuts="r"
          @click="$emit('restart')"
        >
          <ControlIcon name="restart" />
        </button>
        <button
          class="hud-button"
          :class="{ active: !isOverview }"
          :title="isOverview ? t('followPlayer') : t('mapOverview')"
          :aria-label="isOverview ? t('followPlayer') : t('mapOverview')"
          :aria-pressed="!isOverview"
          @click="toggleOverview"
        >
          <ControlIcon :name="isOverview ? 'zoom-in' : 'zoom-out'" />
        </button>
        <button
          class="hud-button"
          :class="{ active: hintOpen }"
          :title="t('hint')"
          :aria-label="t('hint')"
          :aria-pressed="hintOpen"
          :disabled="game.solved"
          @click="toggleHint"
        >
          <ControlIcon name="hint" />
        </button>
        <button
          class="hud-button"
          :title="`${t('menu')} (Esc)`"
          :aria-label="t('menu')"
          aria-keyshortcuts="Escape"
          @click="$emit('panel', 'pause')"
        >
          <ControlIcon name="menu" />
        </button>
      </nav>
    </Transition>
    <span class="sr-only" aria-live="polite">{{ description }}</span>
    <LevelClear v-if="phase === 'clear'" :text="t('levelClear')" :reduced-motion="reducedMotion" />
    <OverlayDialog v-if="showVictory" :label="t(resultTitle)" @dismiss="victoryOpen = false">
      <div v-if="!game.chapter" class="victory-flags">
        <FlagIcon v-for="goal in game.level.goals" :key="goal.country" :country="goal.country" />
      </div>
      <h2 class="result-title">
        {{ t(resultTitle) }}
      </h2>
      <p class="result-moves">
        {{ resultMoves }} <small>{{ t('moves').toLowerCase() }}</small>
      </p>
      <p class="result-message">
        {{ game.chapter ? t('journeyCompleteDesc') : resultDate === utcDay()
          ? t('dailyCompleteDesc') : t('archiveCompleteDesc') }}
      </p>
      <p v-if="game.chapter" class="result-progress">
        {{ t(totals.levels === STORY_COUNT ? 'journeyTotals' : 'journeyPartialTotals', { levels: totals.levels }) }}
      </p>
      <p v-if="timerText && (!game.chapter || totals.levels === STORY_COUNT)" class="result-time">
        {{ t('speedrun') }} <strong>{{ timerText }}</strong>
      </p>
      <p v-if="notice" class="result-notice" role="status">
        {{ notice }}
      </p>
      <div class="result-actions">
        <button class="button primary" @click="$emit('share')">
          {{ t('share') }}
        </button>
        <button v-if="!game.chapter" class="button secondary" @click="$emit('next')">
          {{ t('exploreArchive') }}
        </button>
        <button class="button secondary" @click="$emit('home')">
          {{ t('returnMenu') }}
        </button>
      </div>
    </OverlayDialog>
    <button
      v-if="(storyFinished || (!game.chapter && game.solved && phase === 'results')) && !victoryOpen"
      class="result-reopen button secondary"
      @click="victoryOpen = true"
    >
      {{ t('done') }}
    </button>
    <!-- Pause owns its inline fallback; never stack another modal underneath it. -->
    <OverlayDialog
      v-if="fallbackText && !panelOpen"
      :label="t('share')"
      @dismiss="$emit('dismissShare')"
    >
      <h2 class="result-title">
        {{ t('share') }}
      </h2>
      <textarea
        class="share-text"
        :value="fallbackText"
        readonly
        :aria-label="t('copyFallback')"
        @focus="$event.target.select()"
      />
      <div class="result-actions">
        <button class="button primary" @click="$emit('copy', fallbackText)">
          {{ t('copy') }}
        </button>
        <button class="button secondary" @click="$emit('dismissShare')">
          {{ t('close') }}
        </button>
      </div>
    </OverlayDialog>
  </main>
</template>

<style scoped>
.play-page {
  position: relative;
  height: 100dvh;
  overflow: hidden;
}

/* Keep the HUD above the map without stealing pointer input from the board beneath it. */
.play-hud {
  position: absolute;
  top: max(14px, env(safe-area-inset-top));
  left: max(20px, env(safe-area-inset-left));
  right: max(20px, env(safe-area-inset-right));
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  pointer-events: none;
  color: #eff3df;
}

.play-hud h1 {
  font-size: clamp(16px, 2vw, 22px);
  margin: 0;
  font-weight: 700;
  text-shadow: 0 1px 2px #163f4b44;
}

.hud-stats {
  display: grid;
  justify-items: end;
  gap: 4px;
}

.run-timer,
.result-time strong {
  font-variant-numeric: tabular-nums;
}

.run-timer {
  font-size: 13px;
  white-space: nowrap;
}

.journey-hud {
  margin: 0 0 4px;
  font-size: 11px;
  letter-spacing: 0.04em;
  opacity: 0.85;
}

.move-counter {
  font-size: 12px;
  opacity: 0.9;
  white-space: nowrap;
}

.move-counter b {
  font-size: 17px;
  margin-left: 5px;
  font-variant-numeric: tabular-nums;
}

.is-changing .play-hud,
.is-changing .play-controls {
  opacity: 0;
  pointer-events: none;
}

.play-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  position: absolute;
  left: 50%;
  bottom: max(14px, env(safe-area-inset-bottom));
  transform: translateX(-50%);
  padding: 6px;
  border-radius: 18px;
  background: #1c536577;
}

.hud-button {
  width: 46px;
  height: 46px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #b5d9d266;
  border-radius: 12px;
  background: #245b6ecc;
  color: #f1efdb;
  line-height: 1;
  box-shadow: 0 3px 0 #163f4b77;
}

.hud-button.active {
  background: #043b4ecc;
}

.hud-glyph {
  font-size: 20px;
  line-height: 1;
}

.top-overlay {
  position: absolute;
  top: max(58px, calc(env(safe-area-inset-top) + 48px));
  left: 50%;
  transform: translateX(-50%);
  width: max-content;
  max-width: calc(100vw - 28px);
  padding: 18px 22px;
  border: 2px solid #d9ba7c;
  border-radius: 22px;
  background: #f3efdbf5;
  color: #244e58;
  box-shadow: 0 5px 0 #17445133;
  z-index: 4;
  text-align: center;
}

.deadlock-warning strong {
  display: block;
  font-size: clamp(20px, 3vw, 28px);
  margin-bottom: 12px;
  text-wrap: balance;
}

.recovery-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.recovery-actions .button {
  display: flex;
  align-items: center;
  gap: 8px;
}

kbd {
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.3;
  border: 1px solid currentColor;
  border-radius: 4px;
  padding: 2px 5px;
  opacity: 0.65;
}

.hud-enter-active,
.hud-leave-active {
  transition: opacity 0.18s;
}

.hud-enter-from,
.hud-leave-to {
  opacity: 0;
}

.warning-enter-active,
.warning-leave-active {
  transition: transform 0.25s ease-out, opacity 0.25s ease-out;
}

.warning-enter-from,
.warning-leave-to {
  opacity: 0;
  transform: translate(-50%, -16px);
}

.hint-enter-active,
.hint-leave-active {
  transition: transform 0.18s ease-out, opacity 0.18s;
}

.hint-enter-from,
.hint-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.utility-notice {
  position: absolute;
  left: 50%;
  bottom: 86px;
  transform: translateX(-50%);
  padding: 8px 16px;
  background: #f3efdb;
  color: #244e58;
  border-radius: 12px;
  pointer-events: none;
}

.hint-overlay {
  position: absolute;
  bottom: 88px;
  right: max(16px, env(safe-area-inset-right));
  width: min(340px, calc(100vw - 32px));
  max-height: 40dvh;
  overflow: auto;
  border: 2px solid #c1d6bd;
  border-radius: 18px;
  background: #f3efdbf5;
  color: #244e58;
  box-shadow: 0 5px 20px #163e4933;
}

.geography-popover {
  position: absolute;
  right: 18px;
  top: 60px;
  z-index: 3;
}

.victory-flags {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin: 0 0 18px;
}

.victory-flags svg {
  width: 57px;
  height: 45px;
  border: 3px solid white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.result-title {
  text-wrap: balance;
  font-size: 28px;
}

.result-moves {
  font-size: 32px;
  font-weight: 750;
  margin: 24px 0 28px;
}

.result-moves small {
  font-size: 14px;
  font-weight: 500;
}

.result-message {
  color: #547477;
  font-size: 15px;
  text-wrap: balance;
}

.result-date,
.result-progress {
  color: #547477;
  font-size: 13px;
}

.result-time {
  font-size: 16px;
}

.result-time strong {
  margin-left: 8px;
}

.result-notice {
  margin: 0 0 16px;
  font-size: 14px;
}

.result-actions {
  display: grid;
  gap: 12px;
}

.result-actions .button {
  width: 100%;
  text-wrap: balance;
}

.share-text {
  width: 100%;
  min-height: 130px;
  resize: vertical;
  padding: 12px;
  margin-bottom: 16px;
  color: #244e58;
  border: 1px solid #a8bdac;
  background: #fffcef;
}

.result-reopen {
  position: absolute;
  top: 60px;
  left: 50%;
  transform: translateX(-50%);
}

@media (pointer: coarse) {
  kbd {
    display: none;
  }
}

@media (max-width: 440px) {
  .top-overlay {
    padding: 14px;
  }

  .recovery-actions .button {
    font-size: 13px;
    padding: 10px;
  }
}
</style>
