<script setup>
import { computed } from 'vue'

const props = defineProps({
  help: { type: Object, required: true },
  t: { type: Function, required: true },
  name: { type: Function, required: true },
  solved: Boolean
})

defineEmits(['dismiss'])

const directions = computed(() => {
  // The final reveal shows the whole delivery, while earlier stages show only the next segment.
  const records = props.help.stage === 4 ? props.help.plan?.delivery : props.help.plan?.segment
  return (records ?? []).map(record => props.t(record.direction)).join(' → ')
})

const requestLabel = computed(() => {
  if (props.help.cooldownSeconds > 0) {
    return props.t('hintCooldown', { seconds: props.help.cooldownSeconds })
  }

  return props.t(props.help.stage ? 'moreHelp' : 'hint')
})
</script>

<template>
  <section class="hint-panel">
    <div aria-live="polite" aria-atomic="true">
      <p v-if="help.stage">
        {{ t('hint' + help.stage, { country: name(help.plan.country) }) }}
      </p>
      <p v-else>
        {{ t(help.busy ? 'thinking' : help.unavailable ? 'noHint' : 'hint') }}
      </p>
      <p v-if="help.stage >= 3" class="sr-only">
        {{ t('route', { directions }) }}
      </p>
    </div>
    <div class="hint-actions">
      <!-- Keep the ticking countdown out of the live announcement region. -->
      <button
        v-if="help.stage < 4"
        class="button primary hint-request"
        :disabled="help.busy || solved || help.cooldownSeconds > 0"
        @click="help.request"
      >
        {{ requestLabel }}
      </button>
      <button class="button secondary" @click="$emit('dismiss')">
        {{ t('hideHint') }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.hint-panel {
  padding: 18px;
}

.hint-panel p {
  font-size: var(--font-size-body);
  margin: 0 0 14px;
  text-wrap: pretty;
}

.hint-actions {
  display: flex;
  gap: 10px;
}

.hint-actions .button {
  flex: 1;
  min-width: 0;
  padding: 10px var(--space-3);
  font-size: var(--font-size-label);
  text-wrap: balance;
}

.hint-request {
  font-variant-numeric: tabular-nums;
}

.hint-request:disabled {
  cursor: not-allowed;
  opacity: .65;
}
</style>
