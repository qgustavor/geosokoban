<script setup>
import { useGameContext } from '../ui/game-context.js'
import HomeView from '../ui/HomeView.vue'

const app = useGameContext()
</script>

<template>
  <HomeView
    :t="app.t"
    :completed="app.completed"
    :resume-code="app.resumeCode"
    :challenge="app.challenge"
    :notice="app.notice"
    @start="app.open"
    @challenge="app.setChallenge"
  />
</template>
