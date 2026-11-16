<script setup>
import { computed, ref } from 'vue'
import OverlayDialog from './OverlayDialog.vue'
import GlobeIcon from './GlobeIcon.vue'

const props = defineProps({
  scene: { type: Object, required: true },
  t: { type: Function, required: true }
})
const emit = defineEmits(['finish'])
const index = ref(0)
const line = computed(() => props.scene.lines[index.value])
const speaker = computed(() => props.scene.characters[line.value.speaker])
const lastLine = computed(() => index.value === props.scene.lines.length - 1)

function advance () {
  if (lastLine.value) emit('finish')
  else index.value++
}

function previous () {
  if (index.value > 0) index.value--
}

function key (event) {
  if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return

  // Buttons already handle Enter and Space. Block their repeated keydown default
  // as well as our arrow shortcuts, so holding a key cannot consume the scene.
  if (event.repeat) {
    if (['Enter', ' ', 'ArrowRight', 'ArrowLeft'].includes(event.key)) event.preventDefault()
    return
  }

  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    event.preventDefault()
    if (event.key === 'ArrowRight') advance()
    else previous()
  }
}

function portrait (id, character) {
  const expression = id === line.value.speaker ? line.value.expression : 'neutral'

  return character.portraits?.[expression] ?? character.portraits?.neutral
}
</script>

<template>
  <OverlayDialog
    wide
    class="story-dialog"
    :label="t('storyDialogue')"
    @dismiss="$emit('finish')"
  >
    <section class="story-scene" @keydown.stop="key">
      <header class="story-heading">
        <div>
          <p class="story-tour">
            {{ scene.title }}
          </p>
          <h2>{{ scene.region }}</h2>
        </div>
        <button class="quiet story-skip" @click="$emit('finish')">
          {{ t('skipScene') }}
        </button>
      </header>
      <div class="story-stage" aria-hidden="true">
        <div class="story-horizon" />
        <div
          v-for="(character, id) in scene.characters"
          :key="id"
          class="story-portrait"
          :class="[character.side, { speaking: line.speaker === id }]"
        >
          <img v-if="portrait(id, character)" :src="portrait(id, character)" alt="">
          <GlobeIcon v-else-if="character.art === 'globe'" :uid="`story-${id}`" />
          <div v-else class="visitor-portrait" :class="{ mystery: character.art === 'mystery' }">
            <span>{{ character.art === 'mystery' ? '?' : '✦' }}</span>
          </div>
        </div>
      </div>
      <!-- Whole lines are shown immediately: no timed reading or typewriter announcements. -->
      <div class="story-text" aria-live="polite" aria-atomic="true">
        <p class="story-speaker">
          {{ speaker.name }}
        </p>
        <p class="story-line">
          {{ line.text }}
        </p>
      </div>
      <footer class="story-actions">
        <button class="quiet" :disabled="index === 0" @click="previous">
          {{ t('back') }}
        </button>
        <span class="story-page" :aria-label="t('dialoguePage', { n: index + 1, total: scene.lines.length })">
          {{ index + 1 }} / {{ scene.lines.length }}
        </span>
        <button class="button primary story-advance" autofocus @click="advance">
          {{ t(lastLine ? 'continueStory' : 'nextLine') }} <span aria-hidden="true">→</span>
        </button>
      </footer>
    </section>
  </OverlayDialog>
</template>

<style scoped>
.story-dialog {
  width: min(760px, calc(100vw - 28px));
  padding: 0;
  border-color: #e1d2a5;
  text-align: left;
  overflow: auto;
}

.story-scene { background: #f3efdc; }

.story-heading {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 16px;
  padding: 22px 26px 12px;
}

.story-tour {
  margin: 0 0 5px;
  color: #527477;
  font-size: 12px;
  font-weight: 750;
  letter-spacing: .08em;
}

.story-heading h2 { margin: 0; font-size: clamp(19px, 4vw, 27px); text-wrap: balance; }

.story-skip { flex: none; color: #47666d; }

.story-stage {
  position: relative;
  display: flex;
  align-items: end;
  justify-content: space-around;
  min-height: 130px;
  height: min(24dvh, 210px);
  overflow: hidden;
  background: linear-gradient(#d7e9db, #a4c8be);
  border-block: 1px solid #91b7ad;
}

.story-horizon {
  position: absolute;
  inset: 45% -10% -40%;
  border-radius: 50%;
  background: #73a8a7;
  border-top: 2px solid #e5f0d666;
}

.story-portrait {
  position: relative;
  width: 35%;
  max-width: 165px;
  height: 90%;
  display: flex;
  align-items: end;
  justify-content: center;
  opacity: .55;
  transform: translateY(5px);
  transition: opacity .2s, transform .2s;
}

.story-portrait.left { order: 0; }

.story-portrait.right { order: 1; }

.story-portrait.speaking { opacity: 1; transform: none; }

.story-portrait img, .story-portrait svg {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: bottom;
}

.visitor-portrait {
  width: 85%;
  aspect-ratio: 1;
  border-radius: 45% 55% 42% 48%;
  display: grid;
  place-items: center;
  background: #c9add3;
  border: 3px solid #8d7ea7;
  color: #fcf2cf;
  font-size: clamp(38px, 8vw, 70px);
  margin-bottom: 8px;
}

.visitor-portrait.mystery { background: #57747f; border-color: #466773; color: #d1dfce; }

.story-text { padding: 20px 26px 8px; min-height: 140px; }

.story-speaker { margin: 0 0 8px; color: #3e6570; font-weight: 800; }

.story-line {
  font-size: clamp(15px, 2.4vw, 18px);
  margin: 0;
  line-height: 1.65;
  text-wrap: pretty;
}

.story-actions { display: flex; align-items: center; gap: 18px; padding: 12px 26px 24px; }

.story-page {
  margin-right: auto;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: #547477;
}

.story-advance { min-width: 150px; text-wrap: balance; }

.story-advance span { margin-left: 8px; }

@media (max-height: 540px) {
  .story-stage { min-height: 70px; height: 90px; }
  .story-text { min-height: 0; }
}

@media (max-width: 420px) {
  .story-heading, .story-text, .story-actions { padding-left: 18px; padding-right: 18px; }
  .story-actions { gap: 12px; }
  .story-advance { min-width: 125px; }
}
</style>
