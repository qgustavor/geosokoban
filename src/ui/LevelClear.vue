<script setup>
import { computed } from 'vue'
import { CLEAR_BANNER_MS } from '../core/completion.js'
import { clearLetterWords, CLEAR_LETTER_POP_MS, CLEAR_FADE_MS } from '../core/clear-animation.js'

const props = defineProps({
  text: { type: String, required: true },
  reducedMotion: Boolean
})
const words = computed(() => clearLetterWords(props.text))
const timing = {
  '--clear-duration': `${CLEAR_BANNER_MS}ms`,
  '--letter-duration': `${CLEAR_LETTER_POP_MS}ms`,
  '--clear-fade': `${CLEAR_FADE_MS}ms`
}
</script>

<template>
  <div
    class="clear-announcement"
    :class="{ 'is-still': reducedMotion }"
    :style="timing"
    role="status"
    aria-live="polite"
    aria-atomic="true"
  >
    <!-- Announce the complete translation once, never a series of single letters. -->
    <span class="sr-only">{{ text }}</span>
    <div class="clear-title" aria-hidden="true">
      <span v-for="(word, wordIndex) in words" :key="wordIndex" class="clear-word">
        <span
          v-for="letter in word"
          :key="letter.index"
          class="clear-letter"
          :style="{ '--letter-delay': `${letter.delay}ms`, '--letter-tilt': `${letter.tilt}deg` }"
        >{{ letter.character }}</span>
      </span>
    </div>
  </div>
</template>

<style scoped>
.clear-announcement {
  position: absolute;
  top: max(82px, 18dvh);
  left: 0;
  z-index: 5;
  width: 100%;
  padding: 14px 22px 24px;
  pointer-events: none;
  animation: clear-banner-away var(--clear-fade) ease-in both;
  animation-delay: calc(var(--clear-duration) - var(--clear-fade));
}
.clear-title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  column-gap: .25em;
  row-gap: .12em;
  font-family: Impact, 'Arial Black', 'Trebuchet MS', system-ui, sans-serif;
  font-size: clamp(38px, 7.7vw, 104px);
  font-weight: 1000;
  line-height: 1.12;
  letter-spacing: .025em;
  text-align: center;
}
.clear-word { display: inline-flex; white-space: nowrap; }
.clear-letter {
  display: inline-block;
  color: #fff1b8;
  -webkit-text-stroke: clamp(2px, .3vw, 4px) #173f50;
  paint-order: stroke fill;
  text-shadow: 0 .065em 0 #173f50, 0 .105em 0 #122e42, 0 .15em .12em #12374866;
  transform-origin: 50% 75%;
  animation: clear-letter-pop var(--letter-duration) cubic-bezier(.2, .8, .3, 1) both;
  animation-delay: var(--letter-delay);
}
@keyframes clear-letter-pop {
  0% { opacity: 0; transform: translateY(.32em) scale(.12) rotate(var(--letter-tilt)); }
  44% { opacity: 1; transform: translateY(-.28em) scale(1.24) rotate(var(--letter-tilt)); }
  70% { opacity: 1; transform: translateY(.035em) scale(1.06,.92) rotate(0deg); }
  85% { opacity: 1; transform: translateY(-.055em) scale(.98,1.035) rotate(0deg); }
  100% { opacity: 1; transform: translateY(0) scale(1) rotate(0deg); }
}
@keyframes clear-banner-away {
  from { opacity: 1; }
  to { opacity: 0; }
}
.is-still, .is-still .clear-letter { animation: none; }
@media (prefers-reduced-motion: reduce) {
  .clear-announcement, .clear-letter { animation: none; }
}
@media (max-height: 450px) {
  .clear-announcement { top: 62px; padding-top: 6px; }
  .clear-title { font-size: clamp(34px, 6vw, 68px); }
}
</style>
