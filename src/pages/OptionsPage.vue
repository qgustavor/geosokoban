<script setup>
import { useGameContext } from '../ui/game-context.js'
import OptionsView from '../ui/OptionsView.vue'

const app = useGameContext()
</script>

<template>
  <OptionsView
    :t="app.t"
    :locale="app.locale"
    :reduced="app.reduced"
    @back="app.closePanel"
    @locale="app.locale = $event"
    @reduced="app.reduced = $event"
  />
</template>
