<script setup>
import AudioSettings from './AudioSettings.vue'

defineProps({
  t: { type: Function, required: true },
  locale: { type: String, required: true },
  reduced: Boolean,
  speedrun: Boolean,
  music: Boolean,
  sfx: { type: Boolean, default: true },
  musicVolume: { type: Number, default: 35 },
  sfxVolume: { type: Number, default: 65 },
  embedded: Boolean
})
defineEmits(['back', 'locale', 'reduced', 'speedrun', 'music', 'sfx', 'musicVolume', 'sfxVolume'])
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
      <input
        class="check-control"
        type="checkbox"
        :checked="reduced"
        @change="$emit('reduced', $event.target.checked)"
      >
    </label>

    <label class="option-row speedrun-option">
      <span>
        {{ t('speedrun') }}
      </span>
      <input
        class="check-control"
        type="checkbox"
        :checked="speedrun"
        @change="$emit('speedrun', $event.target.checked)"
      >
    </label>

    <AudioSettings
      :t="t"
      :music="music"
      :sfx="sfx"
      :music-volume="musicVolume"
      :sfx-volume="sfxVolume"
      @music="$emit('music', $event)"
      @sfx="$emit('sfx', $event)"
      @music-volume="$emit('musicVolume', $event)"
      @sfx-volume="$emit('sfxVolume', $event)"
    />

    <button class="button secondary back-button" @click="$emit('back')">
      {{ t('back') }}
    </button>
  </section>
</template>

<style scoped>
.options-page {
  width: min(600px, calc(100vw - 36px));
  margin: 45px auto 70px;
}

.options-page.embedded {
  width: 100%;
  margin: 0;
  text-align: left;
}

.options-page h1 {
  font-size: 26px;
  text-align: center;
  font-weight: var(--font-weight-strong);
  margin: 0 0 var(--space-5);
}

.option-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-5) 0;
  border-bottom: 1px solid var(--color-rule);
  font-size: var(--font-size-control);
}

.option-row select {
  max-width: 155px;
  padding: 10px;
  font: inherit;
  border: 1px solid var(--color-rule);
  border-radius: 8px;
  background: var(--color-select-bg);
  color: var(--color-text);
}

.back-button {
  width: 100%;
  margin-top: var(--space-6);
}
</style>
