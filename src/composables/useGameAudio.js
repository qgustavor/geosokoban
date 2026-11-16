import { onMounted, onUnmounted, ref, watch } from 'vue'
import { createAudioPlayer } from '../audio/player.js'
import { audioSettings } from '../audio/settings.js'
import { attachAudioLifecycle } from '../audio/lifecycle.js'

export function useGameAudio (saved) {
  const settings = audioSettings(saved)
  const music = ref(settings.music)
  const sfx = ref(settings.sfx)
  const musicVolume = ref(settings.musicVolume)
  const sfxVolume = ref(settings.sfxVolume)
  const player = createAudioPlayer(settings)
  let detach = null

  // Apply a toggle while its user gesture is still active. Muting also cancels already-scheduled notes.
  watch([music, sfx, musicVolume, sfxVolume], () => {
    player.configure({
      music: music.value,
      sfx: sfx.value,
      musicVolume: musicVolume.value,
      sfxVolume: sfxVolume.value
    })
  }, { flush: 'sync' })

  onMounted(() => {
    detach = attachAudioLifecycle(player, document, window)
  })

  onUnmounted(() => {
    detach?.()
    player.dispose()
  })

  return {
    music,
    sfx,
    musicVolume,
    sfxVolume,
    play: player.play,
    stopEffects: player.stopEffects,
    setQuiet: player.setQuiet
  }
}
