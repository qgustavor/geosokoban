# Music and sound effects

Music is off by default. Sound effects are on. Options,
including the in-game Options dialog, has independent toggles and volume sliders.
The existing preference save retains both choices and both volume levels.

## Sound design

The prototype includes an original eight-bar, 84 BPM instrumental loop made from
soft sine tones. There are no lyrics, sampled recordings, remote audio requests,
new packages, or additional asset licenses. The tune is intentionally sparse so
it can sit behind a puzzle rather than direct the player's pace.

Effects distinguish walking, pushing, blocked movement, delivering a flag,
completing a board, undo, restart, and an accepted hint. A delivery replaces the
push cue; the final delivery uses the completion cue instead. Undoing back onto a
goal does not celebrate it again. There are no sound-based penalties; optional Speedrun timing is independent of audio.

The dialogue and Options/Pause/Credits overlays lower music to 45% of its selected
level without restarting the tune. Effects have their own gain and stay independent.
All existing visual and accessible game feedback remains available with audio off.

## Editing the sounds

`src/audio/score.js` owns the music and cue data:

- `MUSIC_BPM` is the tempo. Each `MUSIC_BARS` entry has a three-note chord and four
  melody beats. A `null` melody beat is a rest. Pitch uses MIDI note numbers: 60 is
  middle C and 69 is A4. The last bar loops back to the first.
- `SOUND_CUES` uses the keys `walk`, `push`, `blocked`, `delivery`, `complete`,
  `undo`, `restart`, and `hint`. Each note has a pitch, duration in seconds, and
  relative volume. Optional `offset` delays a note within the cue; `endNote` makes
  a pitch glide; `type` selects an oscillator waveform (sine by default).
- `movementSound` selects feedback from an accepted move, keeping country identity
  in delivery checks. Sound selection cannot alter a board or its solution.

Keep cue envelopes and note volumes small. Music and effects already have separate
channel gains in `player.js`; raising every note to full scale can clip overlapping
voices. The synth limits active voices to 32 and rate-limits repeated identical
cues, with a longer interval for blocked movement.

`src/audio/settings.js` defines the defaults and validates persisted settings.
Volumes are integer percentages, clamped to 0–100. Zero-volume music stops its
scheduler; disabling both channels also suspends the audio context.

## Browser lifecycle

`createAudioPlayer` does not create an audio context during page load. The first
trusted pointer, keyboard, or accessible click interaction can unlock it. The
Web Audio resume call happens in that handler, before any awaited work. Repeated
interactions reuse the same context and music scheduler.

Saved music being enabled does not bypass browser autoplay restrictions on a new
page. If playback is denied or a resume remains pending, the next interaction can retry. Effects that happened
before playback was available are dropped, never replayed late.

`attachAudioLifecycle` stops sources and suspends audio when the document is hidden
or receives `pagehide`. Returning to an already activated page can resume music
with a fresh phrase. Effects never accumulate while hidden. Browser interruptions,
a pending resume followed by muting, and component disposal also clear scheduling.

The scheduler refills a short window on the audio clock, rather than using a JS
timer for every note. A delayed timer does not replay missed beats in a burst.
These timers concern audio only; they do not time or penalize gameplay.

## Manual review

Try both channels and their volume sliders from the menu and in-game Options. Reload saved choices, mute during playback, switch tabs, and return after an interruption. Confirm that movement and accessible feedback work with audio disabled or unavailable. Listen on actual devices: source inspection cannot assess whether the loop is pleasant or effects are too loud.
