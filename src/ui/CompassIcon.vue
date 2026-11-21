<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  pose: { type: String, default: 'friendly' },
  reducedMotion: Boolean,
  paused: Boolean,
  west: { type: String, default: 'W' }
})
const magnetized = computed(() => props.pose === 'magnetized')
const needle = ref(null)
let angle = magnetized.value ? 72 : 0
let frame = 0
let phase = null
const between = (min, max) => min + Math.random() * (max - min)

function paint () {
  needle.value?.setAttribute('transform', `rotate(${angle})`)
}

function nextPhase (now) {
  angle = ((angle % 360) + 360) % 360
  const direction = Math.random() < 0.5 ? -1 : 1
  const distance = Math.random() < 0.23 ? between(280, 510) : between(25, 180)

  return {
    start: now + (magnetized.value ? between(80, 380) : 0),
    from: angle,
    to: magnetized.value ? angle + direction * distance : (angle > 180 ? 360 : 0),
    duration: magnetized.value ? between(550, 1300) : 650
  }
}

function tick (now) {
  frame = 0
  if (!phase) phase = nextPhase(now)

  const progress = Math.max(0, Math.min(1, (now - phase.start) / phase.duration))
  const eased = progress * progress * (3 - 2 * progress)
  angle = phase.from + (phase.to - phase.from) * eased
  paint()

  if (progress >= 1) {
    phase = null
    if (!magnetized.value) return
  }
  frame = requestAnimationFrame(tick)
}

function refreshMotion () {
  cancelAnimationFrame(frame)
  frame = 0
  phase = null
  if (!needle.value) return

  if (props.reducedMotion || props.paused) {
    if (!magnetized.value) angle = 0
    else if (props.reducedMotion) angle = 72
    paint()
    return
  }

  paint()
  if (document.hidden) return
  if (magnetized.value || angle % 360 !== 0) frame = requestAnimationFrame(tick)
}

watch(() => [props.pose, props.reducedMotion, props.paused], refreshMotion, { flush: 'post' })
onMounted(() => {
  document.addEventListener('visibilitychange', refreshMotion)
  refreshMotion()
})
onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  document.removeEventListener('visibilitychange', refreshMotion)
})
</script>

<template>
  <svg viewBox="0 0 56 52" aria-hidden="true" class="compass-art">
    <ellipse
      cx="26"
      cy="46"
      rx="12"
      ry="2.6"
      fill="var(--art-object-shadow)"
      class="ground-shadow"
    />
    <g class="character">
      <g class="outline case">
        <path
          d="M26 2.7a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Zm0 2a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z"
          fill="var(--art-compass-rim)"
          fill-rule="evenodd"
          stroke-width=".85"
        />
        <path d="M23.3 10V8.8q2.7-1 5.4 0V10" fill="var(--art-compass-rim)" stroke-width="1.1" />
        <circle
          cx="26"
          cy="27"
          r="17"
          fill="var(--art-compass-rim)"
          stroke-width="1.6"
        />
        <path
          d="M40.9 22.1a15.7 15.7 0 0 1-19.8 19.8"
          fill="none"
          stroke="var(--art-compass-rim-shade)"
          stroke-width=".9"
          opacity=".6"
        />
        <circle
          cx="26"
          cy="27"
          r="14.4"
          fill="var(--art-compass-dial)"
          stroke-width=".8"
        />
        <path
          d="M13 17.7q4.5-6.5 10.5-6.1"
          fill="none"
          stroke="var(--art-compass-rim-light)"
          stroke-width="1.9"
        />
      </g>
      <g
        fill="none"
        stroke="var(--art-compass-dial-mark)"
        stroke-width=".55"
        stroke-linecap="round"
        class="dial"
      >
        <path d="M29.313 14.636L29.494 13.960" />
        <path d="M32.400 15.915L32.750 15.309" />
        <path d="M34.662 18.338L35.546 17.454" />
        <path d="M37.085 20.600L37.691 20.250" />
        <path d="M38.364 23.687L39.040 23.506" />
        <path d="M38.364 30.313L39.040 30.494" />
        <path d="M37.085 33.400L37.691 33.750" />
        <path d="M34.662 35.662L35.546 36.546" />
        <path d="M32.400 38.085L32.750 38.691" />
        <path d="M29.313 39.364L29.494 40.040" />
        <path d="M22.687 39.364L22.506 40.040" />
        <path d="M19.600 38.085L19.250 38.691" />
        <path d="M17.338 35.662L16.454 36.546" />
        <path d="M14.915 33.400L14.309 33.750" />
        <path d="M13.636 30.313L12.960 30.494" />
        <path d="M13.636 23.687L12.960 23.506" />
        <path d="M14.915 20.600L14.309 20.250" />
        <path d="M17.338 18.338L16.454 17.454" />
        <path d="M19.600 15.915L19.250 15.309" />
        <path d="M22.687 14.636L22.506 13.960" />
      </g>
      <g
        fill="var(--art-globe-outline)"
        font-family="var(--font-ui)"
        font-size="2.45"
        font-weight="700"
        text-anchor="middle"
        class="cardinal-directions"
      >
        <text x="26" y="15.65">N</text>
        <text x="38.45" y="27.85">E</text>
        <text x="26" y="40.0">S</text>
        <text x="13.55" y="27.85">{{ west }}</text>
      </g>
      <g transform="translate(26 27)" class="needle-pivot">
        <g ref="needle" class="needle">
          <path
            d="M0-10.65 1.85 0 0 1.1-1.85 0Z"
            fill="var(--art-compass-red)"
            class="outline needle-line"
            stroke-width=".65"
          />
          <path
            d="M0 10.65 1.85 0 0-1.1-1.85 0Z"
            fill="var(--art-globe-sea)"
            class="outline needle-line"
            stroke-width=".65"
          />
          <path
            d="M0-8.7V-2"
            stroke="var(--art-compass-rim-light)"
            stroke-width=".45"
            stroke-linecap="round"
            opacity=".8"
          />
        </g>
      </g>
      <g
        v-if="magnetized"
        fill="none"
        stroke="var(--art-compass-red)"
        stroke-width=".65"
        stroke-linecap="round"
        stroke-linejoin="round"
        opacity=".65"
        class="motion-cues"
      >
        <path d="M34.7 23.5A9.4 9.4 0 0 0 31.3 19.2m.35 1.65-.5-1.8 1.85.1" />
        <path d="M17.2 29.8A9.4 9.4 0 0 0 20.5 34.5m-1.9.05 2-.0-.55-1.8" />
      </g>
      <g v-if="pose === 'magnetized'" class="expression-on-glass">
        <ellipse
          cx="20.5"
          cy="22.65"
          rx="2.15"
          ry="2.65"
          class="face-back"
        />
        <ellipse
          cx="31.5"
          cy="22.65"
          rx="2.15"
          ry="2.65"
          class="face-back"
        />
        <ellipse
          cx="17.8"
          cy="28.1"
          rx="2.1"
          ry="1.1"
          fill="var(--art-globe-cheek)"
          opacity=".75"
        />
        <ellipse
          cx="34.2"
          cy="28.1"
          rx="2.1"
          ry="1.1"
          fill="var(--art-globe-cheek)"
          opacity=".75"
        />
        <ellipse
          cx="20.5"
          cy="22.7"
          rx="1.35"
          ry="1.85"
          fill="var(--art-globe-outline)"
        />
        <ellipse
          cx="31.5"
          cy="22.7"
          rx="1.35"
          ry="1.55"
          fill="var(--art-globe-outline)"
        />
        <path
          d="M18.6 19.4q1.8-1.7 3.8-.6"
          fill="none"
          stroke="var(--art-compass-dial)"
          stroke-width="2.6"
          stroke-linecap="round"
        />
        <path d="M18.6 19.4q1.8-1.7 3.8-.6" class="face-line" stroke-width="1.0" />
        <path
          d="M29.7 19.5l3.6.45"
          fill="none"
          stroke="var(--art-compass-dial)"
          stroke-width="2.6"
          stroke-linecap="round"
        />
        <path d="M29.7 19.5l3.6.45" class="face-line" stroke-width="1.0" />
        <path
          d="M22.8 32.8q1.6-1.6 3.2-.15t3.2-.15"
          fill="none"
          stroke="var(--art-compass-dial)"
          stroke-width="2.6"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path d="M22.8 32.8q1.6-1.6 3.2-.15t3.2-.15" class="face-line" stroke-width="1.2" />
      </g>
      <g v-else-if="pose === 'relieved'" class="expression-on-glass">
        <ellipse
          cx="20.5"
          cy="22.65"
          rx="2.15"
          ry="2.65"
          class="face-back"
        />
        <ellipse
          cx="31.5"
          cy="22.65"
          rx="2.15"
          ry="2.65"
          class="face-back"
        />
        <ellipse
          cx="17.8"
          cy="28.1"
          rx="2.1"
          ry="1.1"
          fill="var(--art-globe-cheek)"
          opacity=".75"
        />
        <ellipse
          cx="34.2"
          cy="28.1"
          rx="2.1"
          ry="1.1"
          fill="var(--art-globe-cheek)"
          opacity=".75"
        />
        <path d="M18.9 23q1.6-2.9 3.2 0" class="face-line" stroke-width="1.2" />
        <path d="M29.9 23q1.6-2.9 3.2 0" class="face-line" stroke-width="1.2" />
        <path
          d="M23.2 32.0q2.8 3.7 5.6 0"
          fill="none"
          stroke="var(--art-compass-dial)"
          stroke-width="2.6"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path d="M23.2 32.0q2.8 3.7 5.6 0" class="face-line" stroke-width="1.2" />
      </g>
      <g v-else class="expression-on-glass">
        <ellipse
          cx="20.5"
          cy="22.65"
          rx="2.15"
          ry="2.65"
          class="face-back"
        />
        <ellipse
          cx="31.5"
          cy="22.65"
          rx="2.15"
          ry="2.65"
          class="face-back"
        />
        <ellipse
          cx="17.8"
          cy="28.1"
          rx="2.1"
          ry="1.1"
          fill="var(--art-globe-cheek)"
          opacity=".75"
        />
        <ellipse
          cx="34.2"
          cy="28.1"
          rx="2.1"
          ry="1.1"
          fill="var(--art-globe-cheek)"
          opacity=".75"
        />
        <ellipse
          cx="20.5"
          cy="22.65"
          rx="1.4"
          ry="1.85"
          fill="var(--art-globe-outline)"
        />
        <ellipse
          cx="31.5"
          cy="22.65"
          rx="1.4"
          ry="1.85"
          fill="var(--art-globe-outline)"
        />
        <path
          d="M23.2 32q2.8 3.3 5.6 0"
          fill="none"
          stroke="var(--art-compass-dial)"
          stroke-width="2.6"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path d="M23.2 32q2.8 3.3 5.6 0" class="face-line" stroke-width="1.2" />
      </g>
      <g transform="translate(26 27)" class="stationary-hub">
        <circle
          r="1.55"
          fill="var(--art-compass-rim-light)"
          class="outline"
          stroke-width=".7"
        />
        <circle
          cx="-.4"
          cy="-.45"
          r=".4"
          fill="var(--art-globe-shine)"
        />
      </g>
      <g v-if="magnetized" transform="translate(43 12) rotate(45)" class="outline magnet">
        <path
          d="M-7 6V-2a7 7 0 0 1 14 0V6H3V-2a3 3 0 0 0-6 0V6Z"
          fill="var(--art-compass-red)"
          stroke-width="1.3"
        />
        <path
          d="M4.4-6.8A6.1 6.1 0 0 1 6.3-2V2.7"
          fill="none"
          stroke="var(--art-compass-red-shade)"
          stroke-width="1.05"
        />
        <path
          d="M-5.7-2.8q.6-4.4 4.7-4.6"
          fill="none"
          stroke="var(--art-globe-cheek)"
          stroke-width="1.1"
        />
        <path d="M-7 2.5h4V6h-4Zm10 0h4V6H3Z" fill="var(--art-compass-metal)" stroke-width="1" />
        <path d="M-6 3.5h2m8 0h2" stroke="var(--art-globe-shine)" stroke-width=".7" />
      </g>
    </g>
  </svg>
</template>

<style scoped>
.outline {
  stroke: var(--art-globe-outline);
  stroke-linecap: round;
  stroke-linejoin: round;
}

.face-line {
  fill: none;
  stroke: var(--art-globe-outline);
  stroke-width: 1.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.face-back {
  fill: var(--art-compass-dial);
}

.needle-line {
  stroke-linejoin: round;
  stroke-linecap: round;
}
</style>
