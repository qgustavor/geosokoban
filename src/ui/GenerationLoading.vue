<script setup>
import { computed, onMounted, ref } from 'vue'
import GlobeIcon from './GlobeIcon.vue'

const props = defineProps({
  feedback: { type: Object, required: true },
  t: { type: Function, required: true }
})

defineEmits(['cancel'])
const cancelButton = ref(null)

const label = computed(() => {
  // An exhausted estimate means work is still ongoing, not that progress has stopped.
  let key

  if (props.feedback.indeterminate) {
    key = 'generationStill'
  } else if (props.feedback.stage === 'map') {
    key = 'generationMap'
  } else if (props.feedback.stage === 'ready') {
    key = 'preparing'
  } else {
    key = 'generationDesign'
  }

  return props.t(key)
})

// Keep cancellation keyboard-accessible while the underlying page is inert.
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
.generation-loading {
  min-height: 440px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-6);
  padding: 48px var(--space-5);
  text-align: center;
}

.loading-globe {
  width: 86px;
  height: 86px;
}

h1 {
  font-size: 25px;
  font-weight: 700;
  margin: 0;
}

.generation-progress {
  appearance: none;
  border: none;
  border-radius: var(--radius-control);
  overflow: hidden;
  width: min(320px, 85vw);
  height: 10px;
  background: var(--color-rule);
  accent-color: var(--color-ink);
}

.generation-progress::-webkit-progress-bar {
  background: var(--color-rule);
  border-radius: var(--radius-control);
}

.generation-progress::-webkit-progress-value {
  background: var(--color-ink);
  border-radius: var(--radius-control);
  transition: width 400ms ease-out;
}

.generation-progress::-moz-progress-bar {
  background: var(--color-ink);
  border-radius: var(--radius-control);
}

.generation-progress:indeterminate {
  background: repeating-linear-gradient(100deg, var(--color-rule) 0 12px, var(--color-ink) 12px 20px);
  animation: loading-wave 1.8s linear infinite;
  background-size: 48px 100%;
}

@keyframes loading-wave {
  to {
    background-position: 48px 0;
  }
}

:global(.reduced-motion) .generation-progress {
  animation: none;
}

:global(.reduced-motion) .generation-progress::-webkit-progress-value {
  transition: none;
}

@media (prefers-reduced-motion: reduce) {
  .generation-progress {
    animation: none;
  }

  .generation-progress::-webkit-progress-value {
    transition: none;
  }
}
</style>
