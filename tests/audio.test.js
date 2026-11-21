import test from 'node:test'
import assert from 'node:assert/strict'
import { createAudioPlayer } from '../src/audio/player.js'
import { audioSettings, DEFAULT_AUDIO_SETTINGS } from '../src/audio/settings.js'
import { attachAudioLifecycle } from '../src/audio/lifecycle.js'
import { movementSound, MUSIC_BARS, MUSIC_BPM, SOUND_CUES } from '../src/audio/score.js'
import { readPreferences, savePreferences } from '../src/ui/storage.js'
import { storyLevel } from '../src/content/story.js'
import { storyCode, STORY_COUNT } from '../src/content/regions.js'
import { initialState, move, isSolved } from '../src/core/engine.js'
import { audioPlatform } from './helpers/audio-platform.js'

function setup (settings, options) {
  const platform = audioPlatform(options)
  const player = createAudioPlayer(settings, platform)
  return { platform, player }
}

test('music is opt-in, sound effects default on, and saved volume is bounded', () => {
  for (const data of [undefined, null, {}, [], 'bad']) {
    assert.deepEqual(audioSettings(data), DEFAULT_AUDIO_SETTINGS)
  }

  assert.deepEqual(audioSettings({ music: true, sfx: false, musicVolume: -1, sfxVolume: 200 }), {
    music: true, sfx: false, musicVolume: 0, sfxVolume: 100
  })
  assert.deepEqual(audioSettings({ music: 'true', sfx: 'false', musicVolume: NaN, sfxVolume: '20' }), {
    music: false, sfx: true, musicVolume: 35, sfxVolume: 65
  })
  assert.equal(audioSettings({ musicVolume: 12.7 }).musicVolume, 13)
})

test('audio preferences round-trip without losing the story checkpoint; old or corrupt saves stay music-off', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  let value = JSON.stringify({ completed: ['south-america-tour-1'], pendingStory: 'asia-tour-2' })
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: () => value,
      setItem (key, saved) {
        value = saved
      }
    }
  })

  try {
    const preferences = readPreferences()
    assert.equal(preferences.music, false)
    assert.equal(preferences.sfx, true)
    savePreferences({ ...preferences, music: true, sfx: false, musicVolume: 22, sfxVolume: 46 })
    const restored = readPreferences()
    assert.equal(restored.music, true)
    assert.equal(restored.sfx, false)
    assert.equal(restored.musicVolume, 22)
    assert.equal(restored.sfxVolume, 46)
    assert.deepEqual(restored.completed, preferences.completed)
    assert.equal(restored.pendingStory, preferences.pendingStory)

    value = '{invalid'
    assert.equal(readPreferences().music, false)
    assert.equal(readPreferences().sfx, true)
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original)
    else delete globalThis.localStorage
  }
})

test('no device or timer is created before a gesture, even with saved music enabled', async () => {
  const { platform, player } = setup({ music: true })
  player.configure({ musicVolume: 42 })
  player.setQuiet(true)
  player.setHidden(false)
  assert.equal(player.play('delivery'), false)
  assert.equal(platform.contexts.length, 0)
  assert.equal(platform.timers.size, 0)

  assert.equal(await player.unlock(), true)
  assert.equal(platform.contexts.length, 1)
  assert.equal(platform.timers.size, 1)
  await player.unlock()
  await player.unlock()
  assert.equal(platform.contexts.length, 1)
  assert.equal(platform.timers.size, 1)
  player.dispose()
})

test('default sound effects do not start music, and rapid repeated bumps are throttled', async () => {
  const { platform, player } = setup()
  await player.unlock()
  const context = platform.contexts[0]
  assert.equal(platform.timers.size, 0)
  assert.equal(context.oscillators.length, 0)
  assert.equal(player.play('blocked'), true)
  assert.equal(player.play('blocked'), false)
  platform.advance(0.17)
  assert.equal(player.play('blocked'), false)
  platform.advance(0.01)
  assert.equal(player.play('blocked'), true)
  assert.equal(player.play('toString'), false)
  assert.equal(player.play(null), false)
  player.dispose()
})

test('muting one channel leaves the other alone; zero-volume music has no scheduler', async () => {
  const { platform, player } = setup({ music: true })
  await player.unlock()
  const context = platform.contexts[0]
  player.play('delivery')
  const sources = [...context.oscillators]
  player.configure({ sfx: false })
  assert.equal(player.play('walk'), false)
  assert.equal(platform.timers.size, 1)
  assert.equal(context.gains[1].gain.value, 0)
  assert.ok(sources.slice(-2).every(source => source.disconnected))
  assert.ok(sources.slice(0, -2).every(source => !source.disconnected))

  player.configure({ musicVolume: 0 })
  assert.equal(platform.timers.size, 0)
  assert.equal(context.state, 'suspended')
  assert.ok(context.oscillators.every(source => source.disconnected))
  player.configure({ sfx: true })
  await player.unlock()
  assert.equal(player.play('push'), true)
  assert.equal(platform.timers.size, 0)
  player.dispose()
})

test('muting music stops future notes without muting an active effect', async () => {
  const { platform, player } = setup({ music: true })
  await player.unlock()
  player.play('delivery')
  const context = platform.contexts[0]
  const effects = context.oscillators.slice(-2)
  player.configure({ music: false })
  assert.equal(platform.timers.size, 0)
  assert.ok(effects.every(source => !source.disconnected))
  assert.equal(context.gains[0].gain.value, 0)
  player.dispose()
})

test('turning both channels off creates no device and enabling music later starts one', async () => {
  const { platform, player } = setup({ music: false, sfx: false })
  assert.equal(await player.unlock(), false)
  assert.equal(platform.contexts.length, 0)
  player.configure({ music: true })
  await player.unlock()
  assert.equal(platform.contexts.length, 1)
  assert.equal(platform.timers.size, 1)
  player.dispose()
})

test('volume changes and dialogue ducking reuse the context and scheduler', async () => {
  const { platform, player } = setup({ music: true })
  await player.unlock()
  const context = platform.contexts[0]
  player.configure({ musicVolume: 60, sfxVolume: 20 })
  assert.equal(context.gains[0].gain.value, 0.6 * 0.28)
  assert.equal(context.gains[1].gain.value, 0.2 * 0.45)
  player.setQuiet(true)
  assert.equal(context.gains[0].gain.value, 0.6 * 0.28 * 0.45)
  player.setQuiet(false)
  assert.equal(context.gains[0].gain.value, 0.6 * 0.28)
  assert.equal(platform.contexts.length, 1)
  assert.equal(platform.timers.size, 1)
  player.dispose()
})

test('hidden pages stop all notes; returning never replays a stale effect', async () => {
  const { platform, player } = setup({ music: true })
  await player.unlock()
  player.play('complete')
  const context = platform.contexts[0]
  const oldNotes = [...context.oscillators]
  player.setHidden(true)
  assert.equal(context.state, 'suspended')
  assert.equal(platform.timers.size, 0)
  assert.ok(oldNotes.every(source => source.disconnected))
  assert.equal(player.play('hint'), false)

  platform.advance(120)
  player.setHidden(false)
  await player.unlock()
  assert.equal(context.state, 'running')
  assert.equal(platform.timers.size, 1)
  const newNotes = context.oscillators.slice(oldNotes.length)
  assert.equal(newNotes.length, 4)
  assert.ok(newNotes.every(source => source.started >= context.currentTime))
  player.dispose()
})

test('muting or hiding while resume is pending prevents late playback', async () => {
  for (const hide of [false, true]) {
    const { platform, player } = setup({ music: true })
    platform.deferResume()
    const pending = player.unlock()
    await Promise.resolve()
    assert.equal(platform.contexts[0].resumes, 1)
    const retried = player.unlock()
    assert.equal(platform.contexts[0].resumes, 2)

    if (hide) player.setHidden(true)
    else player.configure({ music: false, sfx: false })

    platform.finishResume()
    assert.equal(await pending, false)
    assert.equal(await retried, false)
    assert.equal(platform.contexts[0].state, 'suspended')
    assert.equal(platform.contexts[0].oscillators.length, 0)
    assert.equal(platform.timers.size, 0)
    player.dispose()
  }
})

test('autoplay rejection is silent and can be retried by the next interaction', async () => {
  const { platform, player } = setup({ music: true })
  platform.rejectResume(true)
  assert.equal(await player.unlock(), false)
  assert.equal(player.play('delivery'), false)
  assert.equal(platform.timers.size, 0)
  platform.rejectResume(false)
  assert.equal(await player.unlock(), true)
  assert.equal(platform.contexts.length, 1)
  assert.equal(platform.timers.size, 1)
  player.dispose()
})

test('unavailable or throwing audio devices never throw into gameplay', async () => {
  for (const createContext of [() => null, () => {
    throw new Error('Device unavailable')
  }]) {
    const player = createAudioPlayer({ music: true }, { createContext })
    assert.equal(await player.unlock(), false)
    assert.equal(player.play('complete'), false)
    assert.doesNotThrow(() => player.configure({ sfx: false }))
    assert.doesNotThrow(() => player.setHidden(true))
    player.dispose()
  }
})

test('partial audio graph failure closes the device and allows a later retry', async () => {
  const platform = audioPlatform()
  let broken = true
  const player = createAudioPlayer({ music: true }, {
    ...platform,
    createContext () {
      const context = platform.createContext()
      if (broken) {
        context.createGain = () => {
          throw new Error('Audio graph unavailable')
        }
      }
      return context
    }
  })
  assert.equal(await player.unlock(), false)
  assert.equal(platform.contexts[0].closes, 1)
  assert.doesNotThrow(() => player.configure({ sfx: false }))
  broken = false
  assert.equal(await player.unlock(), true)
  assert.equal(platform.timers.size, 1)
  player.dispose()
})

test('timer stalls do not burst missed notes; long loops release finished voices', async () => {
  const { platform, player } = setup({ music: true })
  await player.unlock()
  const context = platform.contexts[0]
  const previous = context.oscillators.length
  platform.advance(60)
  assert.ok(context.oscillators.length - previous <= 4)
  assert.ok(context.oscillators.slice(previous).every(source => source.started >= 60))

  for (let i = 0; i < 2000; i++) platform.advance(0.1)
  assert.ok(context.oscillators.filter(source => !source.disconnected).length < 12)
  assert.equal(platform.timers.size, 1)
  player.dispose()
})

test('browser interruption clears the scheduler and resumes without duplicate loops', async () => {
  const { platform, player } = setup({ music: true })
  await player.unlock()
  const context = platform.contexts[0]
  context.changeState('interrupted')
  assert.equal(platform.timers.size, 0)
  assert.ok(context.oscillators.every(source => source.disconnected))
  await player.unlock()
  assert.equal(platform.timers.size, 1)
  context.changeState('running')
  assert.equal(platform.timers.size, 1)
  player.dispose()
})

test('undo and restart cancel an unfinished celebration; navigation can discard all effects', async () => {
  const { platform, player } = setup()
  await player.unlock()
  player.play('complete')
  const context = platform.contexts[0]
  const celebration = [...context.oscillators]
  player.play('undo')
  assert.ok(celebration.every(source => source.disconnected))
  const undo = context.oscillators.at(-1)
  player.play('restart')
  assert.ok(undo.disconnected)
  player.stopEffects()
  assert.ok(context.oscillators.every(source => source.disconnected))
  player.dispose()
})

test('disposal removes listeners, closes one device and rejects late work', async () => {
  const { platform, player } = setup({ music: true })
  platform.deferResume()
  const pending = player.unlock()
  const context = platform.contexts[0]
  player.dispose()
  player.dispose()
  platform.finishResume()
  assert.equal(await pending, false)
  assert.equal(await player.unlock(), false)
  player.configure({ music: true })
  player.setHidden(false)
  assert.equal(player.play('walk'), false)
  assert.equal(context.closes, 1)
  assert.equal(context.listeners.size, 0)
  assert.equal(platform.timers.size, 0)
})

test('gesture and page lifecycle listeners ignore synthetic input and detach completely', () => {
  function target () {
    const listeners = new Map()
    return {
      listeners,
      addEventListener (name, callback) {
        listeners.set(name, callback)
      },
      removeEventListener (name, callback) {
        assert.equal(listeners.get(name), callback)
        listeners.delete(name)
      },
      emit (name, event) {
        listeners.get(name)?.(event)
      }
    }
  }

  const document = { ...target(), hidden: false }
  const window = { ...target(), navigator: { userActivation: { isActive: true } } }
  const hidden = []
  let activations = 0
  const detach = attachAudioLifecycle({
    unlock () {
      activations++
    },
    setHidden (value) {
      hidden.push(value)
    }
  }, document, window)

  document.emit('pointerdown', { type: 'pointerdown', pointerType: 'touch', isTrusted: true })
  document.emit('keydown', { key: 'Escape', isTrusted: true })
  document.emit('click', { isTrusted: false })
  document.emit('keydown', { isTrusted: true, repeat: true })
  document.emit('keydown', { isTrusted: true, ctrlKey: true })
  assert.equal(activations, 0)
  window.navigator.userActivation.isActive = false
  document.emit('click', { isTrusted: true })
  assert.equal(activations, 0)
  window.navigator.userActivation.isActive = true
  document.emit('pointerup', { type: 'pointerup', pointerType: 'touch', isTrusted: true })
  document.emit('keydown', { isTrusted: true })
  assert.equal(activations, 2)
  document.hidden = true
  document.emit('visibilitychange')
  window.emit('pagehide')
  document.hidden = false
  window.emit('pageshow')
  assert.deepEqual(hidden, [false, true, true, false])
  detach()
  assert.equal(document.listeners.size, 0)
  assert.equal(window.listeners.size, 0)
})

test('score data has bounded notes and envelopes, and no sampled or external assets', () => {
  assert.ok(MUSIC_BPM >= 60 && MUSIC_BPM <= 120)
  for (const bar of MUSIC_BARS) {
    assert.equal(bar.melody.length, 4)
    for (const note of [...bar.chord, ...bar.melody]) {
      assert.ok(note === null || (Number.isInteger(note) && note >= 24 && note <= 96))
    }
  }

  for (const cue of Object.values(SOUND_CUES)) {
    for (const note of cue) {
      assert.ok(note.note >= 24 && note.note <= 96)
      assert.ok(note.duration > 0 && note.duration < 1)
      assert.ok(note.volume > 0 && note.volume <= 0.25)
      assert.ok((note.offset ?? 0) >= 0)
    }
  }
})

test('every certified story solution has one final cue, with no cues for unchanged or undone snapshots', () => {
  let acceptedMoves = 0
  for (let index = 1; index <= STORY_COUNT; index++) {
    for (const hard of [false, true]) {
      const level = storyLevel(storyCode(index) + (hard ? '-hard' : ''))
      let state = initialState(level)
      let completions = 0
      for (const direction of level.solution) {
        const next = move(level, state, direction)
        assert.notEqual(next, state)
        const cue = movementSound(level, state, next)
        assert.ok(['walk', 'push', 'delivery', 'complete'].includes(cue))
        if (cue === 'complete') completions++
        assert.equal(movementSound(level, next, next), null)
        assert.equal(movementSound(level, next, state), null)
        state = next
        acceptedMoves++
      }
      assert.ok(isSolved(level, state))
      assert.equal(completions, 1)
    }
  }
  assert.ok(acceptedMoves > 1000)
})

test('a flag on another country destination is a push, not a delivery', () => {
  const level = { goals: [{ country: 'A', position: 5 }, { country: 'B', position: 6 }] }
  const previous = { moves: 2, pushes: 1, boxes: [{ country: 'B', position: 4 }, { country: 'A', position: 8 }] }
  const next = { moves: 3, pushes: 2, boxes: [{ country: 'B', position: 5 }, { country: 'A', position: 8 }] }
  assert.equal(movementSound(level, previous, next), 'push')
})

test('a fresh gesture retries a still-pending resume after returning to the page', async () => {
  const { platform, player } = setup({ music: true })
  await player.unlock()
  player.setHidden(true)
  platform.deferResume()
  player.setHidden(false)
  const context = platform.contexts[0]
  const attempts = context.resumes
  const retried = player.unlock()
  assert.equal(context.resumes, attempts + 1)
  platform.finishResume()
  assert.equal(await retried, true)
  assert.equal(platform.timers.size, 1)
  assert.equal(platform.contexts.length, 1)
  player.dispose()
})
