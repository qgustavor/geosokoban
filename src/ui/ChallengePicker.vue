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
        class="challenge-card"
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
.challenge-picker { margin: 28px 0 0; border: 0; padding: 0; }

.challenge-picker legend { font-size: 16px; font-weight: 700; margin-bottom: 12px; }

.challenge-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }

.challenge-card {
  padding: 17px 12px;
  border: 2px solid #79a9b14d;
  border-radius: 16px;
  background: #214d62;
  box-shadow: 0 4px 0 #173a4e88;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.challenge-card.active { border-color: #b4a6d5; background: #625f8e; }

.challenge-card:has(input:focus-visible) { outline: 3px solid #f4da87; outline-offset: 3px; }

.difficulty-dots { font-size: 10px; letter-spacing: 3px; color: #f3d984; }

.challenge-card strong { font-size: 14px; }
</style>
