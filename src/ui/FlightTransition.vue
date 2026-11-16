<script setup>
import { onBeforeUnmount, watch } from 'vue'
import PlaneIcon from './PlaneIcon.vue'

const props = defineProps({ phase: { type: String, required: true }, label: { type: String, required: true } })
const emit = defineEmits(['complete'])
let fallback
let completed = false
function complete () {
  if (completed) return
  completed = true
  clearTimeout(fallback)
  emit('complete')
}
watch(() => props.phase, () => {
  clearTimeout(fallback)
  completed = false
  fallback = setTimeout(complete, 700)
}, { immediate: true })
onBeforeUnmount(() => clearTimeout(fallback))
</script>

<template>
  <div class="flight-overlay" role="status" :aria-label="label">
    <div
      :key="phase"
      class="flight-path"
      :class="phase"
      @animationend.self="complete"
    >
      <PlaneIcon class="flight-plane" />
    </div>
  </div>
</template>

<style scoped>
.flight-overlay { position: fixed; inset: 0; z-index: 30; overflow: hidden; background: #33748020; display: grid; place-items: center; pointer-events: all; }
.flight-path { width: clamp(125px, 16vw, 205px); filter: drop-shadow(0 10px 6px #153e4940); }
.flight-plane { display: block; width: 100%; }
.depart { animation: depart .6s cubic-bezier(.4,0,1,1) forwards; }
.arrive { animation: arrive .6s cubic-bezier(0,0,.2,1) forwards; }
@keyframes depart { 0% { transform: translate(0,0) rotate(0); } 35% { transform: translate(10vw,-1vh) rotate(-7deg); } 100% { transform: translate(90vw,-22vh) rotate(-10deg); } }
@keyframes arrive { 0% { transform: translate(-90vw,22vh) rotate(-10deg); } 70% { transform: translate(-9vw,1vh) rotate(-4deg); } 100% { transform: translate(0,0) rotate(0); } }
@media (prefers-reduced-motion: reduce) { .flight-path { animation-duration: 1ms; } }
</style>
