// An original, sparse eight-bar loop. MIDI notes keep the tune editable without recorded assets.
// Each melody entry is one beat; null leaves breathing room between phrases.
export const MUSIC_BPM = 84
export const MUSIC_BARS = [
  { chord: [48, 55, 64], melody: [72, null, 76, 79] },
  { chord: [45, 52, 60], melody: [76, 72, null, 69] },
  { chord: [53, 60, 69], melody: [72, null, 77, 76] },
  { chord: [55, 62, 69], melody: [74, null, 71, null] },
  { chord: [48, 55, 64], melody: [76, 79, null, 72] },
  { chord: [45, 52, 60], melody: [69, null, 72, 76] },
  { chord: [53, 60, 69], melody: [77, 76, 72, null] },
  { chord: [55, 62, 71], melody: [74, 71, null, null] }
]

// Notes use seconds relative to the action. Soft sine/triangle tones avoid harsh noise bursts.
// A delivery or completion replaces the ordinary push cue rather than stacking both sounds.
export const SOUND_CUES = {
  walk: [{ note: 55, endNote: 50, duration: 0.055, volume: 0.13 }],
  push: [{ note: 48, endNote: 43, duration: 0.12, volume: 0.2, type: 'triangle' }],
  blocked: [{ note: 43, endNote: 40, duration: 0.085, volume: 0.12 }],
  delivery: [
    { note: 72, duration: 0.18, volume: 0.2 },
    { note: 79, offset: 0.12, duration: 0.32, volume: 0.18 }
  ],
  complete: [
    { note: 72, duration: 0.24, volume: 0.22 },
    { note: 76, offset: 0.13, duration: 0.24, volume: 0.2 },
    { note: 79, offset: 0.26, duration: 0.24, volume: 0.18 },
    { note: 84, offset: 0.43, duration: 0.65, volume: 0.16 }
  ],
  undo: [{ note: 67, endNote: 60, duration: 0.15, volume: 0.18 }],
  restart: [
    { note: 67, duration: 0.12, volume: 0.16 },
    { note: 60, offset: 0.1, duration: 0.12, volume: 0.16 },
    { note: 55, offset: 0.2, duration: 0.2, volume: 0.14 }
  ],
  hint: [
    { note: 76, duration: 0.14, volume: 0.14 },
    { note: 79, offset: 0.13, duration: 0.24, volume: 0.13 }
  ]
}

/** One accepted action gets one cue. Country identity matters even on the wrong destination. */
export function movementSound (level, previous, next) {
  if (next === previous || next.moves <= previous.moves) return null
  if (next.pushes === previous.pushes) return 'walk'

  const delivered = goal => next.boxes.some(box =>
    box.country === goal.country && box.position === goal.position)

  if (level.goals.every(delivered)) return 'complete'

  const arrived = level.goals.some(goal => {
    if (!delivered(goal)) return false

    return !previous.boxes.some(box => box.country === goal.country && box.position === goal.position)
  })

  return arrived ? 'delivery' : 'push'
}
