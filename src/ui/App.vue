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
        <div class="puzzle-code">
          <span>{{ app.t('codeLabel') }}</span>
          <code>{{ app.activeCode }}</code>
          <div class="puzzle-share-actions">
            <button class="quiet" @click="app.sharePuzzle">{{ app.t('sharePuzzle') }}</button>
            <button class="quiet" @click="app.copyText(app.puzzleURL())">{{ app.t('copyLink') }}</button>
          </div>
          <p v-if="app.notice" role="status">{{ app.notice }}</p>
          <textarea
            v-if="app.fallbackText"
            :value="app.fallbackText"
            :aria-label="app.t('copyFallback')"
            readonly
            @focus="$event.target.select()"
          />
        </div>
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
        @back="app.closePanel"
        @locale="app.locale = $event"
        @reduced="app.reduced = $event"
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
.pause-actions { display: grid; gap: 12px; }

.puzzle-code { display: grid; gap: 6px; margin-bottom: 10px; }

.puzzle-code > span { font-size: 12px; color: #547477; }

.puzzle-code code {
  font-family: inherit;
  font-size: 15px;
  font-weight: 650;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.puzzle-share-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px 16px;
}

.puzzle-share-actions button {
  text-wrap: balance;
}

.puzzle-code p { font-size: 12px; margin: 0; }

.puzzle-code textarea { width: 100%; min-height: 80px; }

.header-tools { flex-wrap: wrap; }

.load-error { padding: 20px; margin: 16px 0; border: 1px solid var(--line); border-radius: 10px; }

.load-error .quiet { margin-left: 16px; }
</style>
