<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'

const props = defineProps({ label: { type: String, required: true }, wide: Boolean })
const emit = defineEmits(['dismiss'])
const dialog = ref(null)
let previousFocus

function focusInitialControl () {
  const initialFocus = dialog.value?.querySelector('[autofocus]') ??
    dialog.value?.querySelector('button, textarea, input, select')

  initialFocus?.focus({ preventScroll: true })
}

// Switching panels reuses the dialog; wait for the new controls before moving focus.
watch(() => props.label, async () => {
  await nextTick()
  focusInitialControl()
})

onMounted(() => {
  previousFocus = document.activeElement
  dialog.value.showModal()
  focusInitialControl()
})

onBeforeUnmount(() => {
  dialog.value?.close()
  // Route changes can remove the opener while the dialog is visible.
  if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
})
</script>

<template>
  <dialog
    ref="dialog"
    class="game-dialog"
    :class="{ wide }"
    :aria-label="label"
    @cancel.prevent="emit('dismiss')"
  >
    <slot />
  </dialog>
</template>

<style scoped>
.game-dialog {
  width: min(390px, calc(100vw - 36px));
  max-height: calc(100dvh - 36px);
  overflow: auto;
  border: 2px solid #bfd4c3;
  border-radius: 22px;
  background: #f2efdb;
  color: #244e58;
  padding: 26px;
  text-align: center;
  box-shadow: 0 8px 0 #143e4744, 0 28px 90px #12384344;
}

.game-dialog.wide { width: min(660px, calc(100vw - 28px)); }

.game-dialog[open] { animation: dialog-appear .22s ease-out both; }

@keyframes dialog-appear {
  from { opacity: 0; transform: translateY(10px) scale(.97); }
  to { opacity: 1; transform: none; }
}

.game-dialog::backdrop { background: #123b4a55; backdrop-filter: blur(2px); }
</style>
