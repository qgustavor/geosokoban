<script setup>
import { useGameContext } from '../ui/game-context.js'
import { RouterLink } from 'vue-router'

const app = useGameContext()
</script>

<template>
  <main class="route-not-found">
    <h1>{{ app.t('pageNotFound') }}</h1>
    <RouterLink class="button secondary" :to="{ name: 'home' }">{{ app.t('home') }}</RouterLink>
  </main>
</template>
