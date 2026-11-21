import { audioSettings } from './settings.js'
import { MUSIC_BARS, MUSIC_BPM, SOUND_CUES } from './score.js'

const LOOK_AHEAD_SECONDS = 0.25
const SCHEDULER_MS = 100
const MAX_VOICES = 32
const SILENCE = 0.0001

function browserContext () {
  const Context = globalThis.AudioContext
  return Context ? new Context() : null
}

function frequency (note) {
  // MIDI 69 is A4; each semitone multiplies frequency by the twelfth root of two.
  const octavesFromA4 = (note - 69) / 12
  return 440 * (2 ** octavesFromA4)
}

/** A single lazy context serves both channels. Audio is optional and must never block game input. */
export function createAudioPlayer (initial) {
  let settings = audioSettings(initial)
  let context = null
  let musicBus = null
  let effectsBus = null
  let resumePending = null
  let activated = false
  let hidden = false
  let quiet = false
  let disposed = false
  let timer = null
  let beat = 0
  let nextBeat = 0

  const voices = new Set()
  const lastPlayed = new Map()

  function wantsMusic () {
    return settings.music && settings.musicVolume > 0
  }

  function wantsEffects () {
    return settings.sfx && settings.sfxVolume > 0
  }

  function allowed () {
    return !disposed && !hidden && activated && (wantsMusic() || wantsEffects())
  }

  function removeVoice (voice) {
    voice.oscillator.onended = null
    voice.oscillator.disconnect()
    voice.envelope.disconnect()
    voices.delete(voice)
  }

  function stopVoices (channel) {
    for (const voice of voices) {
      if (channel && voice.channel !== channel) continue

      // Stop future scheduled tones as well as audible ones, so hiding a tab cannot queue a stale fanfare.
      try {
        voice.oscillator.stop()
      } catch {
        // A source may already have ended while its onended callback is still queued.
      }

      removeVoice(voice)
    }
  }

  function stopMusic () {
    if (timer !== null) clearInterval(timer)
    timer = null
    stopVoices('music')
  }

  function stopEffects () {
    stopVoices('effects')
    lastPlayed.clear()
  }

  function suspend () {
    stopMusic()
    stopEffects()

    if (!context || context.state === 'closed') return

    try {
      Promise.resolve(context.suspend()).catch(() => {})
    } catch {
      // Unsupported or interrupted audio must leave the rest of the game usable.
    }
  }

  function setBusVolume (bus, value) {
    const now = context.currentTime
    bus.gain.cancelScheduledValues(now)
    // A short gain ramp avoids clicks when dragging a volume slider.
    bus.gain.setTargetAtTime(value, now, 0.015)
  }

  function applyVolumes () {
    if (!context || context.state === 'closed') return

    const musicLevel = wantsMusic() ? settings.musicVolume / 100 * 0.28 : 0
    const effectsLevel = wantsEffects() ? settings.sfxVolume / 100 * 0.45 : 0
    setBusVolume(musicBus, musicLevel * (quiet ? 0.45 : 1))
    setBusVolume(effectsBus, effectsLevel)
  }

  function tone (channel, at, { note, endNote, duration, volume, type = 'sine' }) {
    if (voices.size >= MAX_VOICES) return

    const oscillator = context.createOscillator()
    const envelope = context.createGain()
    const voice = { channel, oscillator, envelope }
    voices.add(voice)
    oscillator.onended = () => removeVoice(voice)

    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency(note), at)
    if (endNote !== undefined) {
      oscillator.frequency.exponentialRampToValueAtTime(frequency(endNote), at + duration)
    }

    // A nonzero floor makes exponential release legal; the source is stopped after the envelope fades.
    const attack = Math.min(0.025, duration / 4)
    envelope.gain.setValueAtTime(SILENCE, at)
    envelope.gain.linearRampToValueAtTime(volume, at + attack)
    envelope.gain.exponentialRampToValueAtTime(SILENCE, at + duration)

    oscillator.connect(envelope)
    envelope.connect(channel === 'music' ? musicBus : effectsBus)
    oscillator.start(at)
    oscillator.stop(at + duration + 0.02)
  }

  function scheduleBeat (at) {
    const secondsPerBeat = 60 / MUSIC_BPM
    const bar = MUSIC_BARS[Math.floor(beat / 4) % MUSIC_BARS.length]
    const position = beat % 4
    const melody = bar.melody[position]

    if (position === 0) {
      for (const note of bar.chord) {
        tone('music', at, { note, duration: secondsPerBeat * 3.7, volume: 0.12 })
      }
    }

    if (melody !== null) {
      tone('music', at, { note: melody, duration: secondsPerBeat * 0.9, volume: 0.2 })
    }

    beat = (beat + 1) % (MUSIC_BARS.length * 4)
    nextBeat += secondsPerBeat
  }

  function tick () {
    if (!allowed() || !wantsMusic() || context?.state !== 'running') {
      stopMusic()
      return
    }

    try {
      // JS timers only refill a short look-ahead window; the audio clock keeps the notes evenly spaced.
      // After a stalled event loop, resume ahead of now instead of playing missed beats in a burst.
      if (nextBeat < context.currentTime) nextBeat = context.currentTime + 0.025

      while (nextBeat < context.currentTime + LOOK_AHEAD_SECONDS) scheduleBeat(nextBeat)
    } catch {
      stopMusic()
    }
  }

  function synchronize () {
    if (!allowed()) {
      suspend()
      return
    }

    if (context?.state !== 'running') return

    applyVolumes()

    if (!wantsMusic()) {
      stopMusic()
    } else if (timer === null) {
      // A restored tab starts a new phrase; it never resumes a half-played, stale chord.
      beat = 0
      nextBeat = context.currentTime + 0.025
      timer = setInterval(tick, SCHEDULER_MS)
      tick()
    }

    if (!wantsEffects()) stopEffects()
  }

  function stateChanged () {
    if (context.state === 'running') {
      synchronize()
    } else {
      // Mobile interruptions can suspend audio without a visibilitychange event.
      stopMusic()
      stopEffects()
    }
  }

  function ensureContext () {
    if (context?.state === 'closed') {
      context.removeEventListener('statechange', stateChanged)
      context = null
    }

    if (context) return true

    const created = browserContext()
    if (!created) return false

    // Publish the context only after its graph exists. A failed device setup must remain retryable.
    try {
      const music = created.createGain()
      const effects = created.createGain()
      music.gain.value = 0
      effects.gain.value = 0
      music.connect(created.destination)
      effects.connect(created.destination)
      created.addEventListener('statechange', stateChanged)
      context = created
      musicBus = music
      effectsBus = effects
      return true
    } catch {
      Promise.resolve(created.close()).catch(() => {})
      return false
    }
  }

  function resume (fromGesture = false) {
    if (!allowed()) return Promise.resolve(false)

    try {
      if (!ensureContext()) return Promise.resolve(false)

      if (context.state === 'running') {
        synchronize()
        return Promise.resolve(true)
      }

      if (resumePending && !fromGesture) return resumePending

      // Call resume synchronously inside the gesture handler, not after an awaited operation.
      // A blocked resume may stay pending instead of rejecting; a fresh gesture must be able to retry it.
      const resumed = context.resume()
      const request = Promise.resolve(resumed).then(() => {
        if (resumePending === request) resumePending = null
        if (disposed) return false

        // Preferences or visibility may have changed while the browser was granting playback.
        synchronize()
        return allowed() && context.state === 'running'
      }).catch(() => {
        if (resumePending === request) resumePending = null
        return false
      })

      resumePending = request
      return request
    } catch {
      return Promise.resolve(false)
    }
  }

  function unlock () {
    if (disposed) return Promise.resolve(false)

    activated = true
    return resume(true)
  }

  function configure (next) {
    if (disposed) return

    settings = audioSettings({ ...settings, ...next })
    applyVolumes()
    if (!wantsMusic()) stopMusic()
    if (!wantsEffects()) stopEffects()

    if (allowed()) resume()
    else suspend()
  }

  function play (name) {
    const cue = Object.hasOwn(SOUND_CUES, name) ? SOUND_CUES[name] : null
    if (!cue || !allowed() || !wantsEffects() || context?.state !== 'running') return false

    const now = context.currentTime
    const interval = name === 'blocked' ? 0.18 : 0.07
    if (now - (lastPlayed.get(name) ?? -Infinity) < interval) return false

    try {
      // Completion replaces any still-playing push, while undo/restart cancels an obsolete success sound.
      if (['complete', 'undo', 'restart'].includes(name)) stopEffects()

      lastPlayed.set(name, now)
      for (const note of cue) tone('effects', now + (note.offset ?? 0), note)
      return true
    } catch {
      stopEffects()
      return false
    }
  }

  function setHidden (value) {
    hidden = Boolean(value)
    if (hidden) suspend()
    else if (activated) resume()
  }

  function setQuiet (value) {
    quiet = Boolean(value)
    applyVolumes()
  }

  function dispose () {
    if (disposed) return

    disposed = true
    stopMusic()
    stopEffects()
    if (!context) return

    context.removeEventListener('statechange', stateChanged)
    musicBus?.disconnect()
    effectsBus?.disconnect()

    try {
      Promise.resolve(context.close()).catch(() => {})
    } catch {
      // An already-closed audio device needs no further cleanup.
    }
  }

  return { unlock, configure, play, stopEffects, setHidden, setQuiet, dispose }
}
