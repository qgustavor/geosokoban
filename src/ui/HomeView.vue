<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { challengeSettings, withPlanning } from '../core/challenge.js'
import { STORY_ITINERARY, storyCode, storyIndex, storyStop, STORY_COUNT } from '../content/regions.js'
import { dailyCode } from '../core/seed.js'
import { utcDay, shiftDay, isAvailableDay } from '../core/dates.js'
import ChallengePicker from './ChallengePicker.vue'

const props = defineProps({
  t: { type: Function, required: true },
  completed: { type: Array, required: true },
  resumeCode: { type: String, required: true },
  challenge: { type: String, required: true },
  notice: { type: String, default: '' },
  mode: { type: String, required: true },
  initialDate: { type: String, default: '' }
})
const emit = defineEmits(['start', 'challenge', 'mode'])
const modes = ['story', 'daily', 'archive']
const today = ref(utcDay())
const archiveDate = ref(isAvailableDay(props.initialDate) ? props.initialDate : shiftDay(today.value, -1))
const validDate = computed(() => isAvailableDay(archiveDate.value, today.value))
let dayTimer
onMounted(() => {
  dayTimer = setInterval(() => {
    today.value = utcDay()
  }, 1000)
})
onBeforeUnmount(() => clearInterval(dayTimer))

function changeDay (offset) {
  const day = shiftDay(archiveDate.value, offset)
  if (isAvailableDay(day, today.value)) archiveDate.value = day
}
const symbols = ['↗', '◷', '⤨']
const finished = computed(() => new Set(props.completed.filter(code => storyIndex(code))))
const nextStop = computed(() => storyStop(storyIndex(props.resumeCode)))
// Count chapters from the explicit itinerary rather than from every map available to daily play.
const tours = computed(() => STORY_ITINERARY.map((regions, offset) => {
  const preceding = STORY_ITINERARY.slice(0, offset).reduce((total, stops) => total + stops.length, 0)
  const stops = regions.map((region, index) => finished.value.has(storyCode(preceding + index + 1)))

  return { number: offset + 1, completed: stops.filter(Boolean).length, total: stops.length }
}))
const playLabel = computed(() => {
  if (props.mode !== 'story') return props.t('playNow')
  if (finished.value.size === STORY_COUNT && storyIndex(props.resumeCode) === 1) return props.t('replayJourney')

  return props.t(finished.value.size ? 'continueJourney' : 'beginJourney')
})

function play () {
  // Story always uses its authored route, regardless of the last daily difficulty.
  if (props.mode === 'story') {
    emit('start', props.resumeCode)
    return
  }
  if (props.mode === 'archive' && !validDate.value) return
  const selectedCode = props.mode === 'daily' ? dailyCode() : archiveDate.value
  const { planning } = challengeSettings(props.challenge)
  emit('start', withPlanning(selectedCode, planning))
}
</script>

<template>
  <main class="level-selection">
    <h1 class="sr-only">
      {{ t('home') }}
    </h1>
    <div class="departure-card">
      <fieldset class="mode-grid" aria-describedby="mode-description">
        <legend>{{ t('gameMode') }}</legend>
        <label
          v-for="(choice, index) in modes"
          :key="choice"
          class="mode-card"
          :class="{ active: mode === choice }"
        >
          <input
            :checked="mode === choice"
            type="radio"
            name="game-mode"
            :value="choice"
            class="sr-only"
            @change="$emit('mode', choice)"
          >
          <span class="mode-symbol" aria-hidden="true">{{ symbols[index] }}</span>
          <strong>{{ t(choice) }}</strong>
        </label>
      </fieldset>
      <p id="mode-description" class="mode-description">
        {{ t(mode + 'Desc') }}
      </p>
      <section v-if="mode === 'story'" class="journey-progress" :aria-label="t('journeyProgress')">
        <ol class="tour-stamps">
          <li v-for="tour in tours" :key="tour.number" :class="{ complete: tour.completed === tour.total }">
            <span class="tour-number" aria-hidden="true">
              {{ tour.completed === tour.total ? '✓' : tour.number }}
            </span>
            <div>
              <strong>{{ t('tourLabel', { n: tour.number }) }}</strong>
              <span>{{ t('tourStops', { n: tour.completed, total: tour.total }) }}</span>
            </div>
          </li>
        </ol>
        <p v-if="nextStop" class="next-destination">
          {{ t('nextDestination', { region: t(nextStop.region.name) }) }}
        </p>
      </section>
      <div v-if="mode === 'archive'" class="archive-picker">
        <label for="archive-date" class="sr-only">{{ t('puzzleDate') }}</label>
        <div class="date-controls">
          <button
            class="date-arrow"
            :aria-label="t('previousDay')"
            :disabled="!validDate || !isAvailableDay(shiftDay(archiveDate, -1), today)"
            @click="changeDay(-1)"
          >
            ←
          </button>
          <input
            id="archive-date"
            v-model="archiveDate"
            type="date"
            :max="today"
            required
            :aria-label="t('puzzleDate')"
          >
          <button
            class="date-arrow"
            :aria-label="t('nextDay')"
            :disabled="!validDate || archiveDate >= today"
            @click="changeDay(1)"
          >
            →
          </button>
        </div>
      </div>
      <ChallengePicker
        v-if="mode !== 'story'"
        :value="challenge"
        :t="t"
        @change="$emit('challenge', $event)"
      />
      <div class="departure-footer">
        <button
          class="button primary start-game"
          :disabled="mode === 'archive' && !validDate"
          @click="play"
        >
          {{ playLabel }} <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
    <p v-if="notice" class="notice" role="status">
      {{ notice }}
    </p>
  </main>
</template>

<style scoped>
.archive-picker {
  margin-top: 24px;
}
.archive-picker label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 700;
}
.date-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
.date-controls input {
  min-width: 0;
  width: 180px;
  font-size: 16px;
  text-align: center;
  color-scheme: light;
}
.date-arrow {
  width: 44px;
  height: 44px;
  flex: none;
  border: 1px solid #b4c4b1;
  background: #e9ecda;
  color: #254c59;
  font-size: 22px;
}

.level-selection {
  width: min(800px, calc(100vw - 36px));
  margin: 20px auto 0;
  padding-bottom: 40px;
}

.departure-card {
  padding: clamp(20px, 4vw, 34px);
  border: 1px solid #e2e7c8;
  border-radius: 26px;
  color: #254c59;
  background: #f3efdc;
  box-shadow: 0 6px 0 #1c53684d, 0 18px 50px #183f4b26;
}

.mode-grid {
  border: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
}

.mode-grid legend {
  font-size: 13px;
  font-weight: 750;
  margin-bottom: 14px;
  color: #547477;
}

.mode-card {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  padding: 18px 8px;
  border: 2px solid #ced9c7;
  border-radius: 16px;
  background: #e9ecda;
  cursor: pointer;
  transition: background .16s, border-color .16s;
}

.mode-card:hover {
  border-color: #8cae9f;
}

.mode-card.active {
  border-color: #285e69;
  background: #285e69;
  color: #f4f1d9;
}

.mode-card:has(input:focus-visible) {
  outline: 3px solid #b47b32;
  outline-offset: 4px;
}

.mode-symbol {
  font-size: 25px;
  line-height: 1;
}

.mode-card.active .mode-symbol {
  color: #f2db87;
}

.mode-card strong {
  font-size: 14px;
  text-align: center;
  text-wrap: balance;
}

.mode-description {
  color: #547477;
  font-size: 14px;
  line-height: 1.7;
  margin: 18px 0 0;
  text-wrap: pretty;
}

.journey-progress {
  margin-top: 22px;
  padding-top: 20px;
  border-top: 1px dashed #aabdaf;
}

.tour-stamps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.tour-stamps li {
  display: flex;
  align-items: center;
  gap: 9px;
}

.tour-number {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  flex: none;
  border: 1px solid #b4c4b1;
  border-radius: 50%;
  font-weight: 750;
  color: #6b837a;
}

.complete .tour-number {
  background: #477967;
  border-color: #477967;
  color: #f3efdc;
}

.tour-stamps strong, .tour-stamps li div > span {
  display: block;
  font-size: 12px;
}

.tour-stamps li div > span {
  margin-top: 3px;
  font-size: 11px;
  color: #547477;
}

.next-destination {
  font-size: 12px;
  color: #547477;
  margin: 16px 0 0;
}

.departure-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 20px;
  padding-top: 26px;
  margin-top: 26px;
  border-top: 1px dashed #aabdaf;
}

.start-game {
  min-width: 210px;
  text-wrap: balance;
}

.start-game span {
  margin-left: 12px;
}

.notice {
  margin: 18px 0 0;
}

@media (max-width: 540px) {
  .level-selection {
    margin-top: 8px;
  }

  .mode-grid {
    gap: 7px;
  }

  .mode-card {
    padding: 15px 6px;
  }

  .mode-card strong {
    font-size: 12px;
  }

  .tour-stamps li {
    flex-direction: column;
    text-align: center;
  }

  .start-game {
    width: 100%;
  }
}
</style>
