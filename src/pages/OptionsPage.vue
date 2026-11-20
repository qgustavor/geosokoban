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
</template>
