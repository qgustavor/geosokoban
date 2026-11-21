<script setup>
defineProps({
  kind: { type: String, required: true },
  corner: { type: Number, default: 0 },
  phase: { type: Number, default: 0 }
})

// Offsets keep small details near the four edges of a 40-unit tile, clear of its central actors.
const corners = [[3, 3], [26, 3], [3, 26], [26, 26]]
</script>

<template>
  <g :transform="`translate(${corners[corner][0]},${corners[corner][1]})`" class="ground-detail" aria-hidden="true">
    <!-- Negative delay starts each detail partway through its cycle, avoiding synchronized swaying. -->
    <g class="detail-blades" :style="{ animationDelay: `${-phase}s` }">
      <g v-if="kind === 'flowers'">
        <path d="m5 10 1-6m3 7V8" stroke="var(--art-flower-stem)" />
        <path d="M6 2c2-2 4 1 2 2 3 1 0 4-2 2-2 2-4-1-2-2-2-1 0-4 2-2Z" fill="var(--art-flower-petal)" /><circle
          cx="6"
          cy="4"
          r="1.1"
          fill="var(--art-flower-center)"
        /><circle
          cx="9"
          cy="8"
          r="1.5"
          fill="var(--art-flower-pink)"
        />
      </g>
      <path
        v-else-if="kind === 'fern'"
        d="M6 10V2m0 5L2 5m4 0L3 3m3 5 4-3m-4 0 3-3"
        stroke="var(--art-fern)"
        fill="none"
      />
      <g v-else-if="kind === 'leaves'" fill="var(--art-leaves)">
        <path d="M2 7q0-5 4-4 0 4-4 4Zm5 3q0-4 4-3 0 4-4 3Z" />
      </g>
      <path
        v-else-if="kind === 'lichen'"
        d="M2 9q-2-3 1-3-1-3 2-2 1-3 3-1 4-1 3 3 2 2-1 3Z"
        fill="var(--art-lichen)"
        opacity=".6"
      />
      <g v-else-if="kind === 'pebbles'" fill="var(--art-pebbles)">
        <ellipse
          cx="3"
          cy="9"
          rx="2"
          ry="1.2"
        /><ellipse
          cx="9"
          cy="5"
          rx="1.5"
          ry=".9"
        /><circle cx="7" cy="10" r=".7" />
      </g>
      <g v-else :stroke="kind === 'dryGrass' ? 'var(--art-dry-grass)' : 'var(--art-grass)'" fill="none">
        <path d="m3 10-1-4m4 5V4m2 6 3-4" /><path
          v-if="kind === 'reeds'"
          d="M6 4V1m4 4V2"
          stroke="var(--art-reed-head)"
          stroke-width="1.7"
        />
      </g>
    </g>
  </g>
</template>

<style scoped>
.ground-detail {
  pointer-events: none;
  stroke-width: 1;
  stroke-linecap: round;
  opacity: .85;
}

.detail-blades {
  transform-origin: 6px 11px;
  animation: small-sway 6s ease-in-out infinite;
}

@keyframes small-sway {
  50% {
    transform: skewX(5deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .detail-blades {
    animation: none;
  }
}
</style>
