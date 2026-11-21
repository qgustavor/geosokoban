<script setup>
import { CHALLENGES } from '../core/challenge.js'

defineProps({ value: { type: String, required: true }, t: { type: Function, required: true } })
defineEmits(['change'])
</script>

<template>
  <fieldset class="challenge-picker">
    <legend>{{ t('difficulty') }}</legend>
    <div class="challenge-grid">
      <label
        v-for="(choice, index) in CHALLENGES"
        :key="choice"
        class="choice-card challenge-card"
        :class="{ active: value === choice }"
      >
        <input
          type="radio"
          name="challenge"
          :value="choice"
          :checked="value === choice"
          class="sr-only"
          @change="$emit('change', choice)"
        >
        <span class="difficulty-dots" aria-hidden="true">{{ '●'.repeat(index + 1) }}</span>
        <strong>{{ t('challenge' + choice) }}</strong>
      </label>
    </div>
  </fieldset>
</template>

<style scoped>
.challenge-picker {
  margin: 28px 0 0;
  border: 0;
  padding: 0;
}

.challenge-picker legend {
  font-size: var(--font-size-label);
  font-weight: var(--font-weight-strong);
  margin-bottom: var(--space-3);
  color: var(--color-text-muted);
}

.challenge-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-3);
}

.challenge-card {
  --choice-active-bg: var(--color-challenge-active);
  --choice-active-border: var(--color-challenge-accent);
  --choice-active-text: var(--color-ink);
  --choice-focus-offset: 3px;
  padding: 17px var(--space-3);
}

.difficulty-dots {
  font-size: 10px;
  letter-spacing: 3px;
  color: var(--color-challenge-accent);
}

.challenge-card strong {
  font-size: var(--font-size-body);
}
</style>
