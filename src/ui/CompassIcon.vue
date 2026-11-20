<script setup>
defineProps({ appearance: { type: String, default: 'confused' } })
</script>

<template>
  <svg
    viewBox="0 0 48 52"
    aria-hidden="true"
    class="compass-art"
    :data-appearance="appearance"
  >
    <ellipse
      cx="24"
      cy="47"
      rx="15"
      ry="3"
      fill="#173f4733"
    />
    <g class="compass-body">
      <circle
        cx="24"
        cy="6"
        r="4"
        fill="#eed49c"
        stroke="#234b55"
        stroke-width="1.6"
      />
      <circle
        cx="24"
        cy="27"
        r="20"
        fill="#d7ae69"
        stroke="#234b55"
        stroke-width="1.7"
      />
      <circle
        cx="24"
        cy="27"
        r="16.4"
        fill="#fff2cc"
        stroke="#ad864f"
        stroke-width="1"
      />
      <path
        d="M10 20q3-8 12-9"
        fill="none"
        stroke="#fff9df"
        stroke-width="2.7"
        stroke-linecap="round"
      />
      <path
        d="M39 16a19 19 0 0 1-15 30"
        fill="none"
        stroke="#8b734b"
        stroke-width="2.8"
        opacity=".25"
      />
      <g
        fill="#527477"
        font-size="4.5"
        font-weight="800"
        text-anchor="middle"
      >
        <text x="24" y="16">N</text>
        <text x="12" y="29">W</text>
        <text x="36" y="29">E</text>
        <text x="24" y="42">S</text>
      </g>
      <path d="M14 17l2 2m16-2-2 2m-16 17 2-2m16 2-2-2" stroke="#b6a47b" stroke-width="1" />
      <!-- A separate little needle above the face keeps both direction and expression readable. -->
      <g class="compass-needle" :class="{ tilted: appearance === 'confused' }">
        <path
          d="m24 17 3 7-3-1-3 1Z"
          fill="#c86f60"
          stroke="#234b55"
          stroke-width=".6"
        />
        <path
          d="m24 29 3-6-3 1-3-1Z"
          fill="#87cbd3"
          stroke="#234b55"
          stroke-width=".6"
        />
        <circle
          cx="24"
          cy="23"
          r="1.3"
          fill="#fff2cc"
          stroke="#234b55"
          stroke-width=".7"
        />
      </g>
      <g class="compass-face" fill="#234b55">
        <ellipse
          cx="18"
          cy="30"
          rx="1.35"
          ry="1.9"
        />
        <ellipse
          cx="30"
          cy="30"
          rx="1.35"
          ry="1.9"
        />
        <path
          v-if="appearance === 'confused'"
          d="m16 26 3-1m10 0 3 1"
          fill="none"
          stroke="#234b55"
          stroke-width="1"
          stroke-linecap="round"
        />
        <path
          d="M21 35q3 3.6 6 0"
          fill="none"
          stroke="#234b55"
          stroke-width="1.4"
          stroke-linecap="round"
        />
        <ellipse
          cx="14.5"
          cy="34"
          rx="2.1"
          ry="1.1"
          fill="#dd9c88"
          opacity=".8"
        />
        <ellipse
          cx="33.5"
          cy="34"
          rx="2.1"
          ry="1.1"
          fill="#dd9c88"
          opacity=".8"
        />
      </g>
      <g v-if="appearance === 'confused'" class="compass-magnet" transform="rotate(25 39 12)">
        <path
          d="M34 7v6a5 5 0 0 0 10 0V7h-3v6a2 2 0 0 1-4 0V7Z"
          fill="#cb7367"
          stroke="#234b55"
          stroke-width="1"
        />
        <path
          d="M34 7h3v3h-3Zm7 0h3v3h-3Z"
          fill="#dce9d6"
          stroke="#234b55"
          stroke-width=".6"
        />
      </g>
      <g
        v-if="appearance === 'oriented'"
        fill="#fff2cc"
        stroke="#b8995e"
        stroke-width=".6"
      >
        <path d="m3 16 1-3 1 3 3 1-3 1-1 3-1-3-3-1Z" />
        <path d="m44 34 1-2 1 2 2 1-2 1-1 2-1-2-2-1Z" />
      </g>
    </g>
  </svg>
</template>

<style scoped>
.compass-needle { transform-origin: 24px 23px; transition: transform .6s ease-out; }
.compass-needle.tilted { transform: rotate(68deg); }

@media (prefers-reduced-motion: reduce) {
  .compass-needle { transition: none; }
}
</style>
