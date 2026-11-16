<script setup>
defineProps({
  t: { type: Function, required: true },
  locale: { type: String, required: true },
  reduced: Boolean,
  embedded: Boolean
})
defineEmits(['back', 'locale', 'reduced'])
</script>

<template>
  <section class="options-page" :class="{ embedded }">
    <h1>{{ t('options') }}</h1>

    <label class="option-row">
      <span>{{ t('language') }}</span>
      <select :value="locale" @change="$emit('locale', $event.target.value)">
        <option value="pt-BR">Português</option>
        <option value="en">English</option>
        <option value="es">Español</option>
      </select>
    </label>

    <label class="option-row">
      <span>{{ t('reduceMotion') }}</span>
      <input type="checkbox" :checked="reduced" @change="$emit('reduced', $event.target.checked)">
    </label>

    <button class="button secondary back-button" @click="$emit('back')">
      {{ t('back') }}
    </button>
  </section>
</template>

<style scoped>
.options-page { width: min(600px, calc(100vw - 36px)); margin: 45px auto 70px; }

.options-page.embedded { width: 100%; margin: 0; text-align: left; }

.options-page h1 { font-size: 26px; text-align: center; font-weight: 750; margin: 0 0 20px; }

.option-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 0;
  border-bottom: 1px solid var(--line);
  font-size: 15px;
}

.option-row input { width: 22px; height: 22px; min-height: 22px; flex-shrink: 0; accent-color: #397c89; }

.option-row select {
  max-width: 155px;
  padding: 10px;
  font: inherit;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fffdf7;
  color: #244e58;
}

.back-button { width: 100%; margin-top: 24px; }
</style>
