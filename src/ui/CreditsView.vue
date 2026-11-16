<script setup>
import scenery from '../content/scenery-atlas.json' with { type: 'json' }

defineProps({ t: { type: Function, required: true }, embedded: Boolean })
defineEmits(['back', 'clearProgress'])
</script>

<template>
  <section class="credits-page" :class="{ embedded }">
    <button class="button secondary" @click="$emit('back')">
      ← {{ t('back') }}
    </button>
    <p class="eyebrow">
      GeoSokoban
    </p>
    <h1>{{ t('creditsTitle') }}</h1>
    <p class="credits-lead">
      {{ t('creditsIntro') }}
    </p>

    <section>
      <h2>GeoJogos</h2>
      <a href="https://geojogos.app.br/" target="_blank" rel="noopener noreferrer">{{ t('original') }} ↗</a>
    </section>

    <section>
      <h2>{{ t('fieldNotes') }}</h2>
      <p>{{ t('creditsIdeas') }}</p>
      <p>{{ t('creditsAssets') }}</p>
      <p>{{ t('creditsScope') }}</p>
      <a
        href="https://www.naturalearthdata.com/about/terms-of-use/"
        target="_blank"
        rel="noopener noreferrer"
      >Natural Earth</a> ·
      <a href="https://github.com/lipis/flag-icons" target="_blank" rel="noopener noreferrer">flag-icons</a>
    </section>

    <!-- The neutral fallback does not use the prepared biome atlas. -->
    <section v-if="scenery.status === 'prepared'">
      <p>{{ t('biomeCredits') }}</p>
      <a href="https://ecoregions.world/" target="_blank" rel="noopener noreferrer">RESOLVE Ecoregions 2017</a>
    </section>

    <section>
      <p>{{ t('privacy') }}</p>
      <button class="button secondary" @click="$emit('clearProgress')">
        {{ t('resetProgress') }}
      </button>
    </section>
  </section>
</template>

<style scoped>
.credits-page.embedded { width: 100%; margin: 0; padding: 0; text-align: left; }

.embedded a { color: #285c6b; }

.embedded h1 { font-size: 28px; }

.embedded > .button { margin-bottom: 20px; }
</style>
