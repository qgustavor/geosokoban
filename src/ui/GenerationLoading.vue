<script setup>
import { computed, onMounted, ref } from 'vue'
import GlobeIcon from './GlobeIcon.vue'

const props = defineProps({
  feedback: { type: Object, required: true },
  t: { type: Function, required: true }
})
defineEmits(['cancel'])
const cancelButton = ref(null)
const label = computed(() => props.t(props.feedback.indeterminate
  ? 'generationStill'
  : props.feedback.stage === 'map'
    ? 'generationMap'
    : props.feedback.stage === 'ready' ? 'preparing' : 'generationDesign'))
onMounted(() => cancelButton.value?.focus({ preventScroll: true }))
</script>

<template>
  <main class="generation-loading" aria-labelledby="generation-label">
    <GlobeIcon class="loading-globe" uid="loading-globe" aria-hidden="true" />
    <h1 id="generation-label" role="status" aria-live="polite">
      {{ label }}
    </h1>
    <progress
      class="generation-progress"
      max="1"
      :value="feedback.indeterminate ? undefined : feedback.fraction"
      :aria-label="t('generationProgress')"
      :aria-valuetext="label"
    />
    <button ref="cancelButton" class="button secondary" @click="$emit('cancel')">
      {{ t('cancel') }}
    </button>
  </main>
</template>

<style scoped>
.generation-loading { min-height: 440px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24px; padding: 48px 20px; text-align: center; }
.loading-globe { width: 86px; height: 86px; }
h1 { font-size: 25px; font-weight: 700; margin: 0; }
.generation-progress { appearance: none; border: none; border-radius: 12px; overflow: hidden; width: min(320px, 85vw); height: 10px; background: var(--line); accent-color: var(--ink); }
.generation-progress::-webkit-progress-bar { background: var(--line); border-radius: 12px; }
.generation-progress::-webkit-progress-value { background: var(--ink); border-radius: 12px; transition: width 400ms ease-out; }
.generation-progress::-moz-progress-bar { background: var(--ink); border-radius: 12px; }
.generation-progress:indeterminate { background: repeating-linear-gradient(100deg, var(--line) 0 12px, var(--ink) 12px 20px); animation: loading-wave 1.8s linear infinite; background-size: 48px 100%; }
@keyframes loading-wave { to { background-position: 48px 0; } }
:global(.reduced-motion) .generation-progress { animation: none; }
:global(.reduced-motion) .generation-progress::-webkit-progress-value { transition: none; }
@media (prefers-reduced-motion: reduce) {
  .generation-progress { animation: none; }
  .generation-progress::-webkit-progress-value { transition: none; }
}
</style>
