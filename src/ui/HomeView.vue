<script setup>
import { ref } from 'vue'
import { challengeSettings, withPlanning } from '../core/challenge.js'
import { REGIONS, storyCode } from '../content/regions.js'
import { dailyCode, newCode } from '../core/seed.js'
import ChallengePicker from './ChallengePicker.vue'

const props = defineProps({
  t: { type: Function, required: true }, completed: { type: Array, required: true },
  resumeCode: { type: String, required: true }, challenge: { type: String, required: true }, notice: { type: String, default: '' }
})
const emit = defineEmits(['start', 'challenge'])
const mode = ref('daily')
const code = ref('')
const modes = ['story', 'daily', 'random']
const symbols = ['↗', '◷', '⤨']
function start (code) { emit('start', withPlanning(code, challengeSettings(props.challenge).planning)) }
function play () { start(mode.value === 'story' ? props.resumeCode : mode.value === 'daily' ? dailyCode() : newCode()) }
</script>

<template>
  <main class="level-selection">
    <fieldset class="mode-grid"><legend>{{ t('gameMode') }}</legend>
      <label v-for="(choice, index) in modes" :key="choice" class="mode-card" :class="{ active: mode === choice }">
        <input v-model="mode" type="radio" name="game-mode" :value="choice" class="sr-only">
        <span class="mode-symbol" aria-hidden="true">{{ symbols[index] }}</span><strong>{{ t(choice) }}</strong>
      </label>
    </fieldset>
    <ChallengePicker :value="challenge" :t="t" @change="$emit('challenge', $event)" />
    <button class="button primary start-game" @click="play">{{ t('playNow') }}</button>
    <details v-if="mode === 'story'" class="journey-picker"><summary>{{ t('chooseStop') }}</summary>
      <div class="journey-grid"><section v-for="(region, regionIndex) in REGIONS" :key="region.id">
        <h2>{{ t(region.name) }}</h2>
        <div><button v-for="stop in 3" :key="stop" class="button secondary" @click="start(storyCode(regionIndex * 3 + stop))">
          {{ t('stop', { n: stop }) }} <span v-if="completed.includes(storyCode(regionIndex * 3 + stop))">✓</span>
        </button></div>
      </section></div>
    </details>
    <details class="code-entry"><summary>{{ t('openCode') }}</summary>
      <form class="input-row" @submit.prevent="$emit('start', code)">
        <input v-model="code" :aria-label="t('openCode')" :placeholder="t('codePlaceholder')" maxlength="32" autocomplete="off" spellcheck="false">
        <button class="button secondary">{{ t('open') }}</button>
      </form>
    </details>
    <p v-if="notice" class="notice" role="status">{{ notice }}</p>
  </main>
</template>

<style scoped>
.level-selection { width: min(760px, calc(100vw - 36px)); margin: 24px auto 40px; }
.mode-grid { border: 0; padding: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin: 0; }
.mode-grid legend { font-size: 16px; font-weight: 700; margin-bottom: 14px; }
.mode-card { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 24px 14px; border: 2px solid #79a9b14d; border-radius: 18px; background: #214d62; box-shadow: 0 5px 0 #173a4e99; cursor: pointer; }
.mode-card.active { border-color: #b4a6d5; background: #625f8e; }
.mode-card:has(input:focus-visible) { outline: 3px solid #f4da87; outline-offset: 4px; }
.mode-symbol { font-size: 28px; color: #d2e9dc; }
.mode-card strong { font-size: 16px; }
.start-game { display: block; width: min(360px, 100%); margin: 30px auto; }
.journey-picker, .code-entry { margin-top: 20px; }
summary { cursor: pointer; padding: 10px 0; font-size: 14px; }
.journey-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; margin-top: 10px; }
.journey-grid section { padding: 16px; background: #214d6299; border-radius: 16px; }
.journey-grid h2 { font-size: 16px; }
.journey-grid section div { display: flex; gap: 7px; }
.journey-grid .button { padding: 8px; font-size: 12px; flex: 1; }
.input-row { display: flex; gap: 8px; margin-top: 10px; }
.input-row input { flex: 1; min-width: 0; padding: 12px; }
@media (max-width: 540px) { .mode-grid { grid-template-columns: 1fr; gap: 12px; } .mode-card { justify-content: flex-start; padding: 15px 22px; } .level-selection { margin-top: 14px; } }
</style>
