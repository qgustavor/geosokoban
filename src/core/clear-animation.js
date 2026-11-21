// Keep the last letter's pop + a readable hold inside the completion sequence.
export const CLEAR_LETTER_POP_MS = 540
const CLEAR_LETTER_STAGGER_MS = 42
const CLEAR_LETTER_SWEEP_MS = 560
export const CLEAR_FADE_MS = 180

/** Keep grapheme clusters intact when supported, and group words for wrapping. */
export function clearLetterWords (text) {
  const segmenter = typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null

  const split = value => {
    // Code-point iteration is the fallback: it preserves surrogate pairs, but not every grapheme cluster.
    if (!segmenter) return Array.from(value)

    return [...segmenter.segment(value)].map(part => part.segment)
  }

  const normalizedText = String(text).trim().toLocaleUpperCase()
  const wordTexts = normalizedText.split(/\s+/u).filter(Boolean)
  const words = wordTexts.map(split)
  const count = words.reduce((sum, word) => sum + word.length, 0)

  // There is no delay before the first letter. Compress the remaining gaps for long translations
  // so the last letter still leaves time to pop, be read and fade before the results appear.
  const gapCount = Math.max(1, count - 1)
  const stagger = Math.min(CLEAR_LETTER_STAGGER_MS, CLEAR_LETTER_SWEEP_MS / gapCount)

  // Continue the order across word boundaries; wrapping must not restart the animation.
  let index = 0
  const decorateLetter = character => {
    const order = index++
    const delay = Math.round(order * stagger)
    const tilt = order % 2 ? 4 : -4

    return { character, index: order, delay, tilt }
  }

  return words.map(word => word.map(decorateLetter))
}
