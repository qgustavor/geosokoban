<script setup>
defineProps({
  t: { type: Function, required: true },
  music: Boolean,
  sfx: { type: Boolean, default: true },
  musicVolume: { type: Number, default: 35 },
  sfxVolume: { type: Number, default: 65 }
})
defineEmits(['music', 'sfx', 'musicVolume', 'sfxVolume'])
</script>

<template>
  <fieldset class="audio-settings">
    <legend>{{ t('audio') }}</legend>

    <div class="audio-channel">
      <label class="audio-toggle">
        <span>{{ t('music') }}</span>
        <input
          class="check-control"
          type="checkbox"
          :checked="music"
          @change="$emit('music', $event.target.checked)"
        >
      </label>
      <label class="audio-volume" :class="{ muted: !music }">
        <span>{{ t('musicVolume') }}</span>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          :value="musicVolume"
          :disabled="!music"
          :aria-valuetext="t('volumePercent', { value: musicVolume })"
          @input="$emit('musicVolume', Number($event.target.value))"
        >
        <span class="volume-value" aria-hidden="true">{{ t('volumePercent', { value: musicVolume }) }}</span>
      </label>
    </div>

    <div class="audio-channel">
      <label class="audio-toggle">
        <span>{{ t('soundEffects') }}</span>
        <input
          class="check-control"
          type="checkbox"
          :checked="sfx"
          @change="$emit('sfx', $event.target.checked)"
        >
      </label>
      <label class="audio-volume" :class="{ muted: !sfx }">
        <span>{{ t('sfxVolume') }}</span>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          :value="sfxVolume"
          :disabled="!sfx"
          :aria-valuetext="t('volumePercent', { value: sfxVolume })"
          @input="$emit('sfxVolume', Number($event.target.value))"
        >
        <span class="volume-value" aria-hidden="true">{{ t('volumePercent', { value: sfxVolume }) }}</span>
      </label>
    </div>
  </fieldset>
</template>

<style scoped>
.audio-settings {
  min-width: 0;
  margin: var(--space-6) 0 0;
  padding: 0;
  border: 0;
  text-align: left;
}

.audio-settings legend {
  padding: 0;
  font-size: 17px;
  font-weight: var(--font-weight-strong);
}

.audio-channel {
  padding: var(--space-4) 0;
  border-bottom: 1px solid var(--color-rule);
}

.audio-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  min-height: var(--control-min-size);
  font-size: var(--font-size-control);
}

.audio-volume {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-1) var(--space-3);
  padding-top: 6px;
  font-size: var(--font-size-label);
}

.audio-volume > span:first-child {
  grid-column: 1 / -1;
}

.audio-volume input {
  width: 100%;
  min-width: 0;
  min-height: var(--control-min-size);
  margin: 0;
  padding: 0;
  accent-color: var(--color-control-accent);
}

.volume-value {
  min-width: 4ch;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.audio-volume.muted {
  opacity: 0.6;
}
</style>
