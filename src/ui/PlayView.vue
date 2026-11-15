<script setup>
import { computed, ref, watch, nextTick, onBeforeUnmount } from 'vue'
import { regionById, STORY_COUNT } from '../content/regions.js'
import { createCompletionSequence } from '../core/completion.js'
import GameBoard from './GameBoard.vue'
import HintPanel from './HintPanel.vue'
import OverlayDialog from './OverlayDialog.vue'
import FlagIcon from './FlagIcon.vue'
import ControlIcon from './ControlIcon.vue'

const props = defineProps({
  game: { type: Object, required: true }, help: { type: Object, required: true },
  t: { type: Function, required: true }, name: { type: Function, required: true },
  guidance: { type: String, required: true }, revealed: { type: Array, required: true },
  selected: { type: String, default: '' }, requested: { type: String, default: '' },
  notice: { type: String, default: '' }, fact: { type: String, default: '' },
  fallbackText: { type: String, default: '' }, assisted: Boolean, panelOpen: Boolean
})
const emit = defineEmits(['home', 'key', 'step', 'undo', 'restart', 'inspect', 'destination', 'reveal', 'revealAll', 'guidance', 'next', 'share', 'copy', 'dismissShare', 'panel'])
const visible = country => props.guidance === 'learn' || props.revealed.includes(country)
const regionName = computed(() => props.t(regionById(props.game.level.region).name))
const hintOpen = ref(false)
const victoryOpen = ref(true)
const phase = ref(props.game.solved ? 'results' : 'playing')
const delivery = ref(null)
const sequence = createCompletionSequence(value => { phase.value = value })
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
  delivery.value = { country, position: box.position, id: ++labelRevision }
  labelTimer = setTimeout(() => { if (!props.game.solved) delivery.value = null }, 2800)
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
    clearLabel()
    sequence.reset()
  }
})
watch(() => props.game.state, (next, previous) => {
  if (!previous || next.moves <= previous.moves) { clearLabel(); return }
  const arrived = props.game.level.goals.find(goal =>
    next.boxes.some(box => box.country === goal.country && box.position === goal.position) &&
    !previous.boxes.some(box => box.country === goal.country && box.position === goal.position))
  if (arrived) labelFlag(arrived.country)
  else if (delivery.value && !next.boxes.some(box => box.country === delivery.value.country && box.position === delivery.value.position)) clearLabel()
})
const labels = computed(() => delivery.value && phase.value !== 'results'
  ? [{ ...delivery.value, text: props.name(delivery.value.country) }] : [])
const description = computed(() => {
  const { state, level } = props.game
  const at = position => ({ row: Math.floor(position / level.width) + 1, column: position % level.width + 1 })
  return [props.t('position', at(state.player)), ...state.boxes.map(box => props.t('flagPosition', { country: visible(box.country) ? props.name(box.country) : props.t('unknownFlag'), ...at(box.position) })),
    ...level.goals.map((goal, index) => props.t('goalPosition', { country: visible(goal.country) ? props.name(goal.country) : props.t('destination', { n: index + 1 }), ...at(goal.position) }))].join(' ')
})
function closeHint () { hintOpen.value = false; props.help.clearHint() }
function toggleHint () {
  if (hintOpen.value) closeHint()
  else { hintOpen.value = true; if (!props.help.stage) props.help.request() }
  nextTick(() => document.querySelector('.board-wrap')?.focus({ preventScroll: true }))
}
function boardKey (event) {
  if (event.key === 'Escape') { event.preventDefault(); emit('panel', 'pause'); return }
  emit('key', event)
}
onBeforeUnmount(() => { clearLabel(); sequence.reset() })
</script>

<template>
  <main class="play-page" :data-code="game.level.id" :data-completion="phase">
    <GameBoard :key="game.level.id" :level="game.level" :state="game.state" :facing="game.facing"
      :label="t('board')" :description="description" :labels="labels"
      :show-flags="guidance === 'learn'" :revealed="revealed" :overlay="help.overlay"
      @key="boardKey" @step="$emit('step', $event)" @inspect="inspect" @destination="$emit('destination', $event)" />
    <header class="play-hud">
      <h1>{{ regionName }}</h1>
      <span class="move-counter">{{ t('moves') }} <b>{{ game.state.moves }}</b></span>
    </header>
    <Transition name="warning">
      <section v-if="help.warning && !game.solved" class="top-overlay deadlock-warning" role="status">
        <strong>{{ t('stuck') }}</strong>
        <div class="recovery-actions">
          <button class="button primary" aria-keyshortcuts="z" @click="$emit('undo')"><ControlIcon name="undo" />{{ t('undo') }} <kbd aria-hidden="true">Z</kbd></button>
          <button class="button secondary" aria-keyshortcuts="r" @click="$emit('restart')"><ControlIcon name="restart" />{{ t('restart') }} <kbd aria-hidden="true">R</kbd></button>
        </div>
      </section>
    </Transition>
    <div v-if="notice" class="utility-notice" role="status">{{ notice }}</div>
    <div v-if="requested && !visible(requested)" class="geography-popover">
      <button class="button secondary" @click="$emit('reveal', requested)">{{ t('revealCountry') }}</button>
    </div>
    <Transition name="hint">
      <div v-if="hintOpen && !game.solved" class="hint-overlay">
        <HintPanel :help="help" :t="t" :name="name" :width="game.level.width" :solved="game.solved" @dismiss="closeHint" />
      </div>
    </Transition>
    <nav v-show="!game.solved || phase === 'results'" class="play-controls" :aria-label="t('controls')">
      <button class="hud-button" :title="`${t('undo')} (Z)`" :aria-label="t('undo')" aria-keyshortcuts="z" :disabled="!game.historyCount" @click="$emit('undo')"><ControlIcon name="undo" /></button>
      <button class="hud-button" :title="`${t('restart')} (R)`" :aria-label="t('restart')" aria-keyshortcuts="r" @click="$emit('restart')"><ControlIcon name="restart" /></button>
      <button class="hud-button" :class="{ active: hintOpen }" :title="t('hint')" :aria-label="t('hint')" :aria-pressed="hintOpen" :disabled="game.solved" @click="toggleHint"><ControlIcon name="hint" /></button>
      <button class="hud-button" :title="`${t('menu')} (Esc)`" :aria-label="t('menu')" aria-keyshortcuts="Escape" @click="$emit('panel', 'pause')"><ControlIcon name="menu" /></button>
    </nav>
    <span class="sr-only" aria-live="polite">{{ description }}</span>
    <div v-if="phase === 'clear'" class="clear-announcement" role="status"><span>{{ t('levelClear') }}</span></div>
    <OverlayDialog v-if="game.solved && phase === 'results' && victoryOpen && !fallbackText && !panelOpen" :label="t('done')" @dismiss="victoryOpen = false">
      <div class="victory-flags"><FlagIcon v-for="goal in game.level.goals" :key="goal.country" :country="goal.country" /></div>
      <h2 class="result-title">{{ t(game.chapter === STORY_COUNT ? 'finish' : 'done') }}</h2>
      <p class="result-moves">{{ game.state.moves }} <small>{{ t('moves').toLowerCase() }}</small></p>
      <div class="result-actions">
        <button v-if="game.chapter !== STORY_COUNT" class="button primary" @click="$emit('next')">{{ t(game.chapter ? 'next' : 'another') }}</button>
        <button class="button secondary" @click="$emit('share')">{{ t('share') }}</button>
        <button class="button secondary" @click="$emit('home')">{{ t('returnMenu') }}</button>
      </div>
    </OverlayDialog>
    <button v-if="game.solved && phase === 'results' && !victoryOpen" class="result-reopen button secondary" @click="victoryOpen = true">{{ t('done') }}</button>
    <OverlayDialog v-if="fallbackText" :label="t('share')" @dismiss="$emit('dismissShare')">
      <h2 class="result-title">{{ t('share') }}</h2>
      <textarea class="share-text" :value="fallbackText" readonly :aria-label="t('copyFallback')" @focus="$event.target.select()" />
      <div class="result-actions">
        <button class="button primary" @click="$emit('copy', fallbackText)">{{ t('copy') }}</button>
        <button class="button secondary" @click="$emit('dismissShare')">{{ t('close') }}</button>
      </div>
    </OverlayDialog>
  </main>
</template>

<style scoped>
.play-page { position: relative; height: 100dvh; overflow: hidden; }
.play-hud { position: absolute; top: max(14px, env(safe-area-inset-top)); left: max(20px, env(safe-area-inset-left)); right: max(20px, env(safe-area-inset-right)); display: flex; align-items: center; justify-content: space-between; gap: 12px; pointer-events: none; color: #eff3df; }
.play-hud h1 { font-size: clamp(16px, 2vw, 22px); margin: 0; font-weight: 700; text-shadow: 0 1px 2px #163f4b44; }
.move-counter { font-size: 12px; opacity: .9; white-space: nowrap; }
.move-counter b { font-size: 17px; margin-left: 5px; font-variant-numeric: tabular-nums; }
.play-controls { display: flex; align-items: center; gap: 10px; position: absolute; left: 50%; bottom: max(14px, env(safe-area-inset-bottom)); transform: translateX(-50%); padding: 6px; border-radius: 18px; background: #1c536577; }
.hud-button { width: 46px; height: 46px; padding: 0; display: flex; align-items: center; justify-content: center; border: 1px solid #b5d9d266; border-radius: 12px; background: #245b6ecc; color: #f1efdb; line-height: 1; box-shadow: 0 3px 0 #163f4b77; }
.hud-button.active { background: #776b9d; }
.top-overlay { position: absolute; top: max(58px, calc(env(safe-area-inset-top) + 48px)); left: 50%; transform: translateX(-50%); width: max-content; max-width: calc(100vw - 28px); padding: 18px 22px; border: 2px solid #d9ba7c; border-radius: 22px; background: #f3efdbf5; color: #244e58; box-shadow: 0 5px 0 #17445133; z-index: 4; text-align: center; }
.deadlock-warning strong { display: block; font-size: clamp(20px, 3vw, 28px); margin-bottom: 12px; text-wrap: balance; }
.recovery-actions { display: flex; justify-content: center; gap: 12px; }
.recovery-actions .button { display: flex; align-items: center; gap: 8px; }
kbd { font-family: inherit; font-size: 12px; font-weight: 600; line-height: 1.3; border: 1px solid currentColor; border-radius: 4px; padding: 2px 5px; opacity: .65; }
.warning-enter-active, .warning-leave-active { transition: transform .25s ease-out, opacity .25s ease-out; }
.warning-enter-from, .warning-leave-to { opacity: 0; transform: translate(-50%, -16px); }
.hint-enter-active, .hint-leave-active { transition: transform .18s ease-out, opacity .18s; }
.hint-enter-from, .hint-leave-to { opacity: 0; transform: translateY(8px); }
.utility-notice { position: absolute; left: 50%; bottom: 86px; transform: translateX(-50%); padding: 8px 16px; background: #f3efdb; color: #244e58; border-radius: 12px; pointer-events: none; }
.hint-overlay { position: absolute; bottom: 88px; right: max(16px, env(safe-area-inset-right)); width: min(340px, calc(100vw - 32px)); max-height: 40dvh; overflow: auto; border: 2px solid #c1d6bd; border-radius: 18px; background: #f3efdbf5; color: #244e58; box-shadow: 0 5px 20px #163e4933; }
.geography-popover { position: absolute; right: 18px; top: 60px; z-index: 3; }
.victory-flags { display: flex; justify-content: center; gap: 12px; margin: 0 0 18px; }
.victory-flags svg { width: 38px; height: 30px; }
.result-title { text-wrap: balance; font-size: 28px; }
.result-moves { font-size: 32px; font-weight: 750; margin: 24px 0 28px; }
.result-moves small { font-size: 14px; font-weight: 500; }
.result-actions { display: grid; gap: 12px; }
.result-actions .button { width: 100%; text-wrap: balance; }
.share-text { width: 100%; min-height: 130px; resize: vertical; padding: 12px; margin-bottom: 16px; color: #244e58; border: 1px solid #a8bdac; background: #fffcef; }
.result-reopen { position: absolute; top: 60px; left: 50%; transform: translateX(-50%); }
.clear-announcement { position: absolute; top: 14%; left: 0; width: 100%; display: flex; justify-content: center; pointer-events: none; }
.clear-announcement span { font-size: clamp(28px, 5vw, 52px); font-weight: 850; color: #fff1bd; text-shadow: 0 3px 0 #245364, 0 5px 14px #17394777; text-align: center; text-wrap: balance; animation: level-clear .9s ease both; padding: 10px 20px; }
@keyframes level-clear { 0% { opacity: 0; transform: translateY(-18px); } 25%, 75% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(14px); } }
@media (pointer: coarse) { kbd { display: none; } }
@media (max-width: 440px) { .top-overlay { padding: 14px; } .recovery-actions .button { font-size: 13px; padding: 10px; } }
</style>
