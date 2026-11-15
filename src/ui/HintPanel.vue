<script setup>
import { computed } from 'vue'
const props = defineProps({
  help: { type: Object, required: true },
  t: { type: Function, required: true },
  name: { type: Function, required: true },
  width: { type: Number, required: true },
  solved: Boolean
})
defineEmits(['dismiss'])
const directions = computed(() => {
  const records = props.help.stage === 4 ? props.help.plan?.delivery : props.help.plan?.segment
  return (records ?? []).map(record => props.t(record.direction)).join(' → ')
})
</script>

<template>
  <section class="hint-panel" aria-live="polite">
    <p v-if="help.stage">{{ t('hint' + help.stage, { country: name(help.plan.country) }) }}</p>
    <p v-else>{{ t(help.busy ? 'thinking' : help.unavailable ? 'noHint' : 'hint') }}</p>
    <p v-if="help.stage >= 3" class="sr-only">{{ t('route', { directions }) }}</p>
    <div class="hint-actions">
      <button v-if="help.stage < 4" class="button primary" :disabled="help.busy || solved" @click="help.request">{{ t(help.stage ? 'moreHelp' : 'hint') }}</button>
      <button class="button secondary" @click="$emit('dismiss')">{{ t('hideHint') }}</button>
    </div>
  </section>
</template>

<style scoped>
.hint-panel { padding: 18px; }
.hint-panel p { font-size: 14px; margin: 0 0 14px; text-wrap: pretty; }
.hint-actions { display: flex; gap: 10px; }
.hint-actions .button { flex: 1; padding: 10px 12px; font-size: 13px; }
</style>
