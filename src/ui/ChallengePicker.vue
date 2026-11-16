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

.challenge-picker legend { font-size: 13px; font-weight: 750; margin-bottom: 12px; color: #547477; }

.challenge-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }

.challenge-card {
  padding: 17px 12px;
  border: 2px solid #ced9c7;
  border-radius: 16px;
  background: #e9ecda;
  transition: background .16s, border-color .16s;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.challenge-card.active { border-color: #547b70; background: #d5e4cf; }

.challenge-card:has(input:focus-visible) { outline: 3px solid #b47b32; outline-offset: 3px; }

.difficulty-dots { font-size: 10px; letter-spacing: 3px; color: #547b70; }

.challenge-card strong { font-size: 14px; }
</style>
