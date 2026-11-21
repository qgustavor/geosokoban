<script setup>
import { computed, ref } from 'vue'
import OverlayDialog from './OverlayDialog.vue'
import GlobeIcon from './GlobeIcon.vue'
import CompassIcon from './CompassIcon.vue'
import FlagIcon from './FlagIcon.vue'

const props = defineProps({
  scene: { type: Object, required: true },
  t: { type: Function, required: true },
  reducedMotion: Boolean
})
const emit = defineEmits(['finish'])
const index = ref(0)
const motionPaused = ref(false)
const line = computed(() => props.scene.lines[index.value])
const speaker = computed(() => props.scene.characters[line.value.speaker])
const lastLine = computed(() => index.value === props.scene.lines.length - 1)
const advanceLabel = computed(() => props.t(
  line.value.action ?? (lastLine.value ? 'continueStory' : 'nextLine')
))

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
</script>

<template>
  <OverlayDialog
    wide
    class="story-dialog"
    :label="t('storyDialogue')"
    @dismiss="$emit('finish')"
  >
    <section
      class="story-scene"
      :class="{ 'is-still': reducedMotion }"
      @keydown.stop="key"
    >
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
      <div class="story-stage-wrap">
        <div class="story-stage" aria-hidden="true">
          <div class="story-horizon" />
          <div
            v-for="(pose, id) in line.stage"
            :key="id"
            class="story-portrait"
            :class="[
              scene.characters[id].side,
              {
                speaking: line.speaker === id,
                distant: scene.characters[id].art === 'silhouette',
                compass: scene.characters[id].art === 'compass'
              }
            ]"
          >
            <GlobeIcon v-if="scene.characters[id].art === 'globe'" :uid="`story-${id}`" />
            <CompassIcon
              v-else-if="scene.characters[id].art === 'compass'"
              :pose="pose"
              :reduced-motion="reducedMotion"
              :paused="motionPaused"
              :west="t('compassWest')"
            />
            <div v-else class="story-silhouette" />
          </div>
        </div>
        <button
          v-if="line.stage.compass === 'magnetized' && !reducedMotion"
          class="quiet story-motion"
          :aria-pressed="motionPaused"
          @click="motionPaused = !motionPaused"
        >
          {{ t(motionPaused ? 'resumeNeedle' : 'pauseNeedle') }}
        </button>
      </div>
      <!-- Whole lines are shown immediately: no timed reading or typewriter announcements. -->
      <div class="story-text" aria-live="polite" aria-atomic="true">
        <p class="story-speaker">
          {{ speaker.name }}
        </p>
        <p class="story-line" :data-country="line.country">
          <FlagIcon v-if="line.country" :country="line.country" class="story-fact-flag" />
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
          {{ advanceLabel }} <span aria-hidden="true">→</span>
        </button>
      </footer>
    </section>
  </OverlayDialog>
</template>

<style scoped>
.story-dialog {
  width: min(760px, calc(100vw - 28px));
  padding: 0;
  border-color: var(--color-story-border);
  text-align: left;
  overflow: auto;
}

.story-scene {
  background: var(--color-panel-bg);
}

.story-heading {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: var(--space-4);
  padding: 22px 26px var(--space-3);
}

.story-tour {
  margin: 0 0 5px;
  color: var(--color-story-tour);
  font-size: var(--font-size-caption);
  font-weight: var(--font-weight-strong);
  letter-spacing: .08em;
}

.story-heading h2 {
  margin: 0;
  font-size: clamp(19px, 4vw, 27px);
  text-wrap: balance;
}

.story-skip {
  flex: none;
  color: var(--color-story-skip);
}

.story-stage-wrap {
  position: relative;
}

.story-stage {
  position: relative;
  display: flex;
  align-items: end;
  justify-content: space-around;
  min-height: 130px;
  height: min(24dvh, 210px);
  overflow: hidden;
  background: linear-gradient(var(--art-story-sky-top), var(--art-story-sky-bottom));
  border-block: 1px solid var(--art-story-stage-border);
}

.story-horizon {
  position: absolute;
  inset: 45% -10% -40%;
  border-radius: 50%;
  background: var(--art-story-horizon);
  border-top: 2px solid var(--art-story-horizon-edge);
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

.story-portrait.compass {
  width: 49%;
  max-width: 231px;
  height: 100%;
}

.story-portrait.left {
  order: 0;
}

.story-portrait.right {
  order: 1;
}

.story-portrait.speaking {
  opacity: 1;
  transform: none;
}

.story-portrait svg {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: bottom;
}

.story-portrait.distant {
  position: absolute;
  right: 18%;
  bottom: 49%;
  width: 26px;
  height: 26px;
  opacity: .7;
  transform: none;
}

.story-silhouette {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: var(--art-mystery-bg);
  animation: silhouette-run 2.8s ease-out both;
}

@keyframes silhouette-run {
  0% {
    transform: translate(-25px, 0);
  }

  25% {
    transform: translate(0, -5px) scale(.95);
  }

  50% {
    transform: translate(25px, 0) scale(.85);
  }

  75% {
    opacity: .8;
    transform: translate(50px, -4px) scale(.75);
  }

  100% {
    opacity: 0;
    transform: translate(75px, 0) scale(.65);
  }
}

.is-still .story-silhouette {
  animation: none;
}

.story-motion {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  border-radius: var(--radius-control);
  background: var(--color-panel-bg);
  color: var(--color-text);
  font-size: var(--font-size-caption);
}

.story-fact-flag {
  display: inline-block;
  width: 1.6em;
  height: 1.2em;
  margin-right: .3em;
  vertical-align: -.2em;
}

.story-text {
  padding: var(--space-5) 26px var(--space-2);
  min-height: 140px;
}

.story-speaker {
  margin: 0 0 var(--space-2);
  color: var(--color-story-speaker);
  font-weight: 800;
}

.story-line {
  font-size: clamp(15px, 2.4vw, 18px);
  margin: 0;
  line-height: 1.65;
  text-wrap: pretty;
}

.story-actions {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: var(--space-3) 26px var(--space-6);
}

.story-page {
  margin-right: auto;
  font-size: var(--font-size-caption);
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted);
}

.story-advance {
  min-width: 150px;
  text-wrap: balance;
}

.story-advance span {
  margin-left: var(--space-2);
}

@media (max-height: 540px) {
  .story-stage {
    min-height: 70px;
    height: 90px;
  }

  .story-text {
    min-height: 0;
  }
}

@media (max-width: 420px) {
  .story-heading,
  .story-text,
  .story-actions {
    padding-left: 18px;
    padding-right: 18px;
  }

  .story-actions {
    gap: var(--space-3);
  }

  .story-advance {
    min-width: 125px;
  }
}
</style>
