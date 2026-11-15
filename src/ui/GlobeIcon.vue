<script setup>
defineProps({ direction: { type: String, default: 'down' }, uid: { type: String, default: 'globe' } })
</script>

<template>
  <svg viewBox="0 0 40 44" aria-hidden="true" class="globe-art" :data-facing="direction">
    <defs><clipPath :id="uid"><circle cx="20" cy="21" r="16.5" /></clipPath></defs>
    <ellipse cx="20" cy="39" rx="12" ry="2.6" fill="#173f4733" />
    <g class="globe-idle">
      <circle cx="20" cy="21" r="17" fill="#87cbd3" stroke="#234b55" stroke-width="1.6" />
      <g :clip-path="`url(#${uid})`">
        <g transform="rotate(180 20 21)" fill="#dce6b5">
          <path v-if="direction === 'up'" d="m1 11 7-4 6 3 3 6-3 6 2 4-6 1-4-8-5-2Zm17-4 10 2 7-4 6 7-6 5-7-1-3 7-5-4-1-5Zm7 22 7-3 6 6-4 7-7-1-3-6Z" />
          <path v-else-if="direction === 'left'" d="m1 7 12-3 6 5-2 7-7 4-2 8-6-5Zm14 16 7 2 2 6-4 10-4-4-1-6Zm17-17 8 5v13l-7-5-4-7Z" />
          <path v-else-if="direction === 'right'" d="m1 9 11-4 6 4-4 6-7 1-5 7Zm14 7 8 1 4 7-3 11-5-1-4-9Zm13-9 8-3 5 9-5 5-7-2Zm4 24 8-3v12l-8-1Z" />
          <path v-else d="m1 10 8-5 7 3 2 4-4 5-5 1-1 7-5-5Zm12 14 7 1 4 5-3 10-4-3-2-7Zm13-17 7-2 8 7-3 5-8-1-4-3Zm0 12 8 1 5 7-6 11-5-4-1-8Z" />
        </g>
        <path d="M3 21h34M20 4c-10 9-10 25 0 34m0-34c10 9 10 25 0 34" fill="none" stroke="#387580" stroke-width=".65" opacity=".21" />
        <path d="M7 12q5-8 13-6" stroke="#f2f8de" stroke-width="2.8" stroke-linecap="round" opacity=".6" fill="none" />
        <path d="M33 8a17 17 0 0 1-16 30" fill="none" stroke="#387580" stroke-width="4" opacity=".18" />
        <g v-if="direction !== 'up'" :transform="direction === 'left' ? 'translate(40 0) scale(-1 1)' : undefined">
          <g v-if="direction === 'down'" class="face">
            <g class="eyes"><ellipse cx="14" cy="22" rx="1.5" ry="2" fill="#234b55" /><ellipse cx="26" cy="22" rx="1.5" ry="2" fill="#234b55" /></g>
            <path d="M17 27q3 3.5 6 0" fill="none" stroke="#234b55" stroke-width="1.4" stroke-linecap="round" />
            <ellipse cx="10" cy="27" rx="2.3" ry="1.2" fill="#dd9c88" opacity=".75" /><ellipse cx="30" cy="27" rx="2.3" ry="1.2" fill="#dd9c88" opacity=".75" />
          </g>
          <g v-else class="face"><ellipse cx="30" cy="22" rx="1.2" ry="2" fill="#234b55" /><path d="M32 27q3 2 5-1" fill="none" stroke="#234b55" stroke-width="1.4" stroke-linecap="round" /><ellipse cx="27" cy="27" rx="2" ry="1.2" fill="#dd9c88" opacity=".75" /></g>
        </g>
      </g>
    </g>
  </svg>
</template>

<style scoped>
.globe-idle { transform-origin: 20px 37px; animation: breathe 4.5s ease-in-out infinite; }
.eyes { transform-origin: 20px 22px; animation: blink 7s linear infinite; }
@keyframes breathe { 50% { transform: scale(1.012, .986); } }
@keyframes blink { 0%, 92%, 97%, 100% { transform: scaleY(1); } 94%, 95% { transform: scaleY(.13); } }
@media (prefers-reduced-motion: reduce) { .globe-idle, .eyes { animation: none; } }
</style>
