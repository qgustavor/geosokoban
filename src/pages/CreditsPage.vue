<script setup>
import { useGameContext } from '../ui/game-context.js'
import CreditsView from '../ui/CreditsView.vue'
const app = useGameContext()
</script>

<template>
  <CreditsView :t="app.t" @back="app.closePanel" @clear-progress="app.completed = []" />
</template>
