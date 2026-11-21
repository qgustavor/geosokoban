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
          class="choice-card mode-card"
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
  margin-top: var(--space-6);
}

.archive-picker label {
  display: block;
  margin-bottom: var(--space-2);
  font-size: var(--font-size-label);
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
  font-size: var(--font-size-lead);
  text-align: center;
  color-scheme: light;
}

.date-arrow {
  width: 44px;
  height: 44px;
  flex: none;
  border: 1px solid var(--color-stamp-border);
  background: var(--color-choice-bg);
  color: var(--color-ink);
  font-size: 22px;
}

.level-selection {
  width: min(800px, calc(100vw - 36px));
  margin: var(--space-5) auto 0;
  padding-bottom: 40px;
}

.departure-card {
  padding: clamp(var(--space-5), 4vw, 34px);
  border: 1px solid var(--color-panel-border);
  border-radius: var(--radius-panel);
  color: var(--color-ink);
  background: var(--color-panel-bg);
  box-shadow: var(--shadow-panel);
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
  font-size: var(--font-size-label);
  font-weight: var(--font-weight-strong);
  margin-bottom: 14px;
  color: var(--color-text-muted);
}

.mode-card {
  justify-content: center;
  padding: 18px var(--space-2);
}

.mode-card:hover:not(.active) {
  border-color: var(--color-choice-hover);
}

.mode-symbol {
  font-size: 25px;
  line-height: 1;
}

.mode-card.active .mode-symbol {
  color: var(--color-primary-bg);
}

.mode-card strong {
  font-size: var(--font-size-body);
  text-align: center;
  text-wrap: balance;
}

.mode-description {
  color: var(--color-text-muted);
  font-size: var(--font-size-body);
  line-height: 1.7;
  margin: 18px 0 0;
  text-wrap: pretty;
}

.journey-progress {
  margin-top: 22px;
  padding-top: var(--space-5);
  border-top: 1px dashed var(--color-panel-divider);
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
  border: 1px solid var(--color-stamp-border);
  border-radius: 50%;
  font-weight: var(--font-weight-strong);
  color: var(--color-stamp-text);
}

.complete .tour-number {
  background: var(--color-stamp-complete);
  border-color: var(--color-stamp-complete);
  color: var(--color-panel-bg);
}

.tour-stamps strong,
.tour-stamps li div > span {
  display: block;
  font-size: var(--font-size-caption);
}

.tour-stamps li div > span {
  margin-top: 3px;
  font-size: 11px;
  color: var(--color-text-muted);
}

.next-destination {
  font-size: var(--font-size-caption);
  color: var(--color-text-muted);
  margin: var(--space-4) 0 0;
}

.departure-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-5);
  padding-top: 26px;
  margin-top: 26px;
  border-top: 1px dashed var(--color-panel-divider);
}

.start-game {
  min-width: 210px;
  text-wrap: balance;
}

.start-game span {
  margin-left: var(--space-3);
}

.notice {
  margin: 18px 0 0;
}

@media (max-width: 540px) {
  .level-selection {
    margin-top: var(--space-2);
  }

  .mode-grid {
    gap: 7px;
  }

  .mode-card {
    padding: 15px 6px;
  }

  .mode-card strong {
    font-size: var(--font-size-caption);
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
