<script setup>
import { useGameContext } from '../ui/game-context.js'
import PlayView from '../ui/PlayView.vue'
const app = useGameContext()
</script>

<template>
  <PlayView v-if="app.activeCode" :game="app.session" :help="app.help" :t="app.t" :name="app.name"
    :guidance="app.guidance" :revealed="app.revealed" :selected="app.selected" :requested="app.requested"
    :panel-open="!!app.panel" :reduced-motion="app.reducedMotion" @transition="app.setBoardTransitioning" :notice="app.notice" :fact="app.fact" :fallback-text="app.fallbackText" :assisted="app.assisted"
    @home="app.home" @panel="app.showPanel" @key="app.key" @step="app.step" @undo="app.undo" @restart="app.restart" @inspect="app.inspect"
    @destination="app.selectDestination" @reveal="app.reveal" @reveal-all="app.revealAll" @guidance="app.setGuidance"
    @next="app.nextPuzzle" @share="app.share" @copy="app.copyText($event)" @dismiss-share="app.dismissShare" />
  <main v-else-if="!app.failure" class="route-pending" aria-live="polite">{{ app.t('preparing') }}</main>
</template>
