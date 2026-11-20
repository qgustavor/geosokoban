<script setup>
import { useRoute } from 'vue-router'
import { useGameContext } from '../ui/game-context.js'
import HomeView from '../ui/HomeView.vue'

const app = useGameContext()
const route = useRoute()
</script>

<template>
  <HomeView
    :t="app.t"
    :completed="app.completed"
    :resume-code="app.resumeCode"
    :challenge="app.challenge"
    :notice="app.notice"
    :mode="app.mode"
    :initial-date="typeof route.query.date === 'string' ? route.query.date : ''"
    @start="app.open"
    @challenge="app.setChallenge"
    @mode="app.setMode"
  />
</template>
