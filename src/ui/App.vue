<script setup>
import { provide, reactive } from 'vue'
import { RouterView } from 'vue-router'
import { useGameController } from '../composables/useGameController.js'
import { gameContext } from './game-context.js'
import GlobeIcon from './GlobeIcon.vue'
import StoryDialogue from './StoryDialogue.vue'
import GenerationLoading from './GenerationLoading.vue'
import OverlayDialog from './OverlayDialog.vue'
import OptionsView from './OptionsView.vue'
import CreditsView from './CreditsView.vue'

// Keep one controller above RouterView so navigation changes the page, not the game session.
// The reactive wrapper unwraps its refs for both the shell and injected route views.
const app = reactive(useGameController())

provide(gameContext, app)
</script>

<template>
  <div class="app-shell" :class="{ 'reduced-motion': app.reduced }">
    <header v-if="app.view !== 'puzzle'" class="topbar">
      <button class="brand" :aria-label="app.t('home')" @click="app.home">
        <GlobeIcon class="brand-globe" uid="brand-globe" />
        <span class="brand-name">GeoSokoban</span>
      </button>
      <span class="prototype-badge">{{ app.t('prototype') }}</span>
      <div class="header-tools">
        <button class="quiet" :disabled="app.session.loading" @click="app.showPanel('options')">
          {{ app.t('options') }}
        </button>
        <button class="quiet credits-link" :disabled="app.session.loading" @click="app.showPanel('credits')">
          {{ app.t('credits') }}
        </button>
        <label class="language-picker">
          <span class="sr-only">{{ app.t('language') }}</span>
          <select v-model="app.locale">
            <option value="en">English</option>
            <option value="pt-BR">Português</option>
            <option value="es">Español</option>
          </select>
        </label>
      </div>
    </header>
    <GenerationLoading
      v-if="app.session.loadingDisplay.visible"
      :feedback="app.session.loadingDisplay"
      :t="app.t"
      @cancel="app.cancelGeneration"
    />
    <!-- Preserve the mounted page during loading, but block input even before the loader appears. -->
    <div
      v-show="!app.session.loadingDisplay.visible"
      :inert="app.session.loading || !!app.storyScene || undefined"
      :aria-busy="app.session.loading"
    >
      <section v-if="app.failure" class="load-error" role="alert">
        <p>{{ app.t(app.failure.key) }}</p>
        <p>{{ app.t('reportPuzzle', { code: app.failure.code }) }}</p>
        <button class="button secondary" @click="app.copyFailure">
          {{ app.t('copyReport') }}
        </button>
        <p v-if="app.notice" role="status">
          {{ app.notice }}
        </p>
        <textarea
          v-if="app.fallbackText"
          :value="app.fallbackText"
          :aria-label="app.t('copyReport')"
          readonly
          @focus="$event.target.select()"
        />
        <button v-if="app.failure.code" class="button secondary" @click="app.retry">
          {{ app.t('retry') }}
        </button>
        <button class="quiet" @click="app.home">
          {{ app.t('home') }}
        </button>
      </section>
      <RouterView />
    </div>
    <StoryDialogue
      v-if="app.storyScene"
      :key="app.storyScene.id"
      :scene="app.storyScene"
      :t="app.t"
      @finish="app.finishStory"
    />
    <!-- Options and credits share a dialog so opening them does not replace the current puzzle. -->
    <OverlayDialog
      v-if="app.panel"
      :label="app.t(app.panel === 'pause' ? 'menu' : app.panel)"
      :wide="app.panel === 'credits'"
      @dismiss="app.closePanel"
    >
      <div v-if="app.panel === 'pause'" class="pause-actions">
        <button class="button primary" @click="app.closePanel">
          {{ app.t('resume') }}
        </button>
        <button class="button secondary" @click="app.showPanel('options')">
          {{ app.t('options') }}
        </button>
        <button class="button secondary" @click="app.showPanel('credits')">
          {{ app.t('credits') }}
        </button>
        <button class="button secondary" @click="app.home">
          {{ app.t('returnMenu') }}
        </button>
      </div>
      <OptionsView
        v-else-if="app.panel === 'options'"
        embedded
        :t="app.t"
        :locale="app.locale"
        :reduced="app.reduced"
        :speedrun="app.speedrun"
        :music="app.audio.music"
        :sfx="app.audio.sfx"
        :music-volume="app.audio.musicVolume"
        :sfx-volume="app.audio.sfxVolume"
        @back="app.closePanel"
        @locale="app.locale = $event"
        @reduced="app.reduced = $event"
        @speedrun="app.speedrun = $event"
        @music="app.audio.music = $event"
        @sfx="app.audio.sfx = $event"
        @music-volume="app.audio.musicVolume = $event"
        @sfx-volume="app.audio.sfxVolume = $event"
      />
      <CreditsView
        v-else
        embedded
        :t="app.t"
        @back="app.closePanel"
        @clear-progress="app.clearProgress"
      />
    </OverlayDialog>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100dvh;
  background-color: var(--color-page-bg);
  background-image: var(--art-ocean-pattern);
}

.topbar {
  width: min(1000px, calc(100vw - 36px));
  min-height: 94px;
  margin: auto;
  padding: 14px 0;
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.brand {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  background: none;
  border: 0;
  padding: 0;
}

.brand-globe {
  width: 46px;
  height: 50px;
}

.brand-name {
  font-size: 26px;
  font-weight: 850;
  letter-spacing: -.7px;
  text-shadow: var(--shadow-brand);
}

.prototype-badge {
  background: var(--color-badge-bg);
  border: 1px solid var(--color-badge-border);
  color: var(--color-badge-text);
  border-radius: 7px;
  padding: 5px 7px;
  font-size: 9px;
  font-weight: var(--font-weight-strong);
  letter-spacing: .07em;
}

.header-tools {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.language-picker select {
  font-size: var(--font-size-caption);
}

.load-error {
  width: min(600px, calc(100vw - 36px));
  margin: var(--space-6) auto;
  background: var(--color-error-bg);
  padding: var(--space-5);
  border: 1px solid var(--color-rule);
  border-radius: 10px;
}

@media (max-width: 650px) {
  .topbar {
    gap: 10px;
    min-height: 78px;
    flex-wrap: wrap;
  }

  .brand-globe {
    width: 34px;
    height: 40px;
  }

  .brand-name {
    font-size: 21px;
  }

  .header-tools {
    gap: var(--space-3);
  }

  .prototype-badge {
    font-size: 8px;
  }

  .header-tools .quiet {
    font-size: var(--font-size-caption);
  }

  .language-picker select {
    max-width: 105px;
    padding: 5px;
  }
}

.pause-actions {
  display: grid;
  gap: var(--space-3);
}

.load-error .quiet {
  margin-left: var(--space-4);
}
</style>
