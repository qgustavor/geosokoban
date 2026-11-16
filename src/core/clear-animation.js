// Keep the last letter's pop + a readable hold inside the completion sequence.
export const CLEAR_LETTER_POP_MS = 540
export const CLEAR_LETTER_STAGGER_MS = 42
export const CLEAR_LETTER_SWEEP_MS = 560
export const CLEAR_FADE_MS = 180

/** Preserve accented letters/emoji as one visual unit, while allowing word wrap. */
export function clearLetterWords (text) {
  const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null
  const split = value => segmenter ? [...segmenter.segment(value)].map(part => part.segment) : Array.from(value)
  const words = String(text).trim().toLocaleUpperCase().split(/\s+/u).filter(Boolean).map(split)
  const count = words.reduce((sum, word) => sum + word.length, 0)
  const stagger = Math.min(CLEAR_LETTER_STAGGER_MS, CLEAR_LETTER_SWEEP_MS / Math.max(1, count - 1))
  let index = 0
  return words.map(word => word.map(character => {
    const order = index++
    return { character, index: order, delay: Math.round(order * stagger), tilt: order % 2 ? 4 : -4 }
  }))
}
