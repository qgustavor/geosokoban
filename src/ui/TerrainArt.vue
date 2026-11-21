<script setup>
// Scenery chooses these visual variants independently of collision rules; every obstacle occupies one cell.
defineProps({ kind: { type: String, required: true }, flip: Boolean })
</script>

<template>
  <!-- Translate before mirroring so the artwork remains inside the same 40-unit tile. -->
  <g
    class="terrain-art"
    aria-hidden="true"
    :data-terrain="kind"
    :transform="flip ? 'translate(40 0) scale(-1 1)' : undefined"
  >
    <ellipse
      cx="20"
      cy="34"
      rx="15"
      ry="4"
      fill="var(--art-object-shadow)"
      stroke="none"
    />
    <g v-if="['broadleaf', 'olive', 'acacia', 'dryTree', 'mangrove'].includes(kind)">
      <path d="M17 33 18 17h5l1 16" fill="var(--art-tree-trunk)" />
      <path v-if="kind === 'mangrove'" d="m20 26-9 8m11-8 8 8m-7-7 1 9" fill="none" />
      <g class="canopy" :class="kind">
        <path v-if="kind === 'acacia'" d="M19 20 11 14m11 7 7-10" fill="none" />
        <path
          v-if="kind === 'dryTree'"
          d="M21 26 20 11m0 7-7-6-2-6m8 9 6-7m-1 15 7-7m-16 5-7-4"
          fill="none"
          stroke="var(--art-tree-branch)"
          stroke-width="2.6"
        />
        <template v-else>
          <path
            v-if="kind === 'acacia'"
            d="M4 13C2 8 8 5 13 7c3-6 10-5 13-1 7-1 12 3 11 8-5 4-27 4-33-1Z"
            fill="var(--art-acacia-canopy)"
          />
          <path
            v-else-if="kind === 'olive'"
            d="M5 20C1 13 8 7 13 9 14 3 22 2 26 7c9-1 13 8 7 14-6 6-22 6-28-1Z"
            fill="var(--art-olive-canopy)"
          />
          <path
            v-else
            d="M6 24C0 20 3 12 8 11 6 4 15 1 20 5c7-5 15 0 13 7 7 4 5 13-1 14-9 4-18 2-26-2Z"
            :fill="kind === 'mangrove' ? 'var(--art-mangrove-canopy)' : 'var(--art-broadleaf-canopy)'"
          />
          <path
            d="M9 13q2-5 7-4m7-1q5-2 7 3"
            fill="none"
            stroke="var(--art-canopy-highlight)"
            stroke-width="2.1"
            opacity=".55"
          />
          <path
            v-if="kind !== 'acacia'"
            d="M10 23q11 6 21 0"
            fill="none"
            stroke="var(--art-tree-vein)"
            opacity=".35"
          />
        </template>
        <g v-if="kind === 'dryTree'" fill="var(--art-dry-tree-leaf)" stroke="none">
          <ellipse
            cx="10"
            cy="9"
            rx="3"
            ry="2"
          /><ellipse
            cx="26"
            cy="8"
            rx="3.2"
            ry="2"
          /><ellipse
            cx="30"
            cy="17"
            rx="3"
            ry="2.1"
          />
        </g>
      </g>
    </g>
    <g v-else-if="kind === 'pine'">
      <path d="M17 34v-9h6v9" fill="var(--art-pine-trunk)" />
      <g class="canopy">
        <path d="m20 3 10 12h-4l8 10h-6l7 7H5l7-7H6l8-10h-4Z" fill="var(--art-pine-canopy)" />
        <path
          d="m20 7-5 7m4 6-6 5"
          fill="none"
          stroke="var(--art-pine-highlight)"
          stroke-width="2"
        /><path d="m21 7 5 9-4-2 6 12-6-3 6 8h6l-7-7h6l-8-10h4Z" fill="var(--art-pine-shade)" stroke="none" />
      </g>
    </g>
    <g v-else-if="kind === 'mandacaru'">
      <path
        d="M15 34V11c0-5 7-5 7 0v10h4V12c0-5 6-5 6 0v12q0 4-5 4h-5v6ZM15 25H9q-4 0-4-4v-5c0-4 6-4 6 0v3h4"
        fill="var(--art-cactus)"
      />
      <path
        d="M18 33V11m11 1v12h-7M8 16v6h6"
        fill="none"
        stroke="var(--art-cactus-rib)"
        stroke-width="1.3"
      />
      <path
        d="m17 6 1-3 2 3 3-1-1 4-5-1Z"
        fill="var(--art-cactus-flower)"
        stroke="var(--art-cactus-flower-outline)"
        stroke-width=".9"
      />
    </g>
    <g v-else-if="kind === 'ridge' || kind === 'snowRock'">
      <path d="m3 32 9-17q2-3 4 0l4 6L25 8q2-4 5 0l8 24q-15 4-35 0Z" fill="var(--art-ridge)" />
      <path d="m27 8 1 24h10L30 8q-2-3-3 0Z" fill="var(--art-ridge-shade)" stroke="none" />
      <path
        v-if="kind === 'snowRock'"
        d="m20 21 5-13q2-4 5 0l3 10-5-3-3 4-2-2Z"
        fill="var(--art-snow)"
        stroke="var(--art-snow-outline)"
        stroke-width="1"
      />
      <path
        v-else
        d="m25 10-4 12m-8-6-4 9"
        fill="none"
        stroke="var(--art-ridge-highlight)"
        stroke-width="2"
      />
    </g>
    <g v-else-if="kind === 'reef'">
      <ellipse
        cx="20"
        cy="33"
        rx="18"
        ry="4"
        fill="var(--art-reef-water)"
        stroke="none"
      />
      <path d="m4 31 4-12 8-4 8 5 3 12Z" fill="var(--art-reef-back)" />
      <path d="m18 32 3-8 9-6 7 8v6Z" fill="var(--art-reef-front)" />
      <path
        d="m8 20 7-3m11 7 4-3M3 35q17 4 34 0"
        fill="none"
        stroke="var(--art-reef-highlight)"
        stroke-width="1.4"
      />
    </g>
    <g v-else>
      <path
        d="M4 30 7 19 16 11 28 13 35 23l1 9q-17 6-32-2Z"
        :fill="kind === 'sandstone' ? 'var(--art-sandstone)' : 'var(--art-boulder)'"
      />
      <path
        d="m16 12 3 14 16 6-1-9-7-10Z"
        :fill="kind === 'sandstone' ? 'var(--art-sandstone-shade)' : 'var(--art-boulder-shade)'"
        stroke="none"
      />
      <path
        d="m9 20 7-5m-8 11 4-2"
        fill="none"
        :stroke="kind === 'sandstone' ? 'var(--art-sandstone-highlight)' : 'var(--art-boulder-highlight)'"
        stroke-width="2.2"
      />
      <path
        v-if="kind === 'sandstone'"
        d="m8 23 11-2 12 2m-22 5 10-1 14 3"
        fill="none"
        stroke="var(--art-sandstone-grain)"
        stroke-width="1.1"
        opacity=".6"
      />
    </g>
  </g>
</template>

<style scoped>
.terrain-art {
  stroke: var(--art-terrain-outline);
  stroke-width: 1.45;
  stroke-linecap: round;
  stroke-linejoin: round;
  pointer-events: none;
}

.canopy {
  transform-origin: 20px 29px;
  animation: foliage 7s ease-in-out infinite;
}

@keyframes foliage {
  0%,
  70%,
  100% {
    transform: rotate(0);
  }

  83% {
    transform: rotate(1.5deg);
  }

  93% {
    transform: rotate(-.7deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .canopy {
    animation: none;
  }
}
</style>
