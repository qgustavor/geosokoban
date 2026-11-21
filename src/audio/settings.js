const DEFAULT_AUDIO_SETTINGS = Object.freeze({
  music: false,
  sfx: true,
  musicVolume: 35,
  sfxVolume: 65
})

function volume (value, fallback) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback

  return Math.round(Math.max(0, Math.min(100, value)))
}

/** Default to quiet music and clamp saved volume values to the slider range. */
export function audioSettings (data) {
  return {
    music: data?.music === true,
    sfx: data?.sfx !== false,
    musicVolume: volume(data?.musicVolume, DEFAULT_AUDIO_SETTINGS.musicVolume),
    sfxVolume: volume(data?.sfxVolume, DEFAULT_AUDIO_SETTINGS.sfxVolume)
  }
}
