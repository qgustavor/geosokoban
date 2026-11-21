import { utcDay, isCalendarDay } from './dates.js'
import { REGIONS, storyIndex, storyStop } from '../content/regions.js'

function hashSeed (text) {
  let hash = 2166136261

  // Hash UTF-16 code units with 32-bit multiplication for deterministic puzzle selection.
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

/** Integer arithmetic makes this PRNG independent of locale and platform. */
export function randomFrom (seed) {
  let value = hashSeed(seed)

  return () => {
    // Advance once per draw, wrapping the state to an unsigned 32-bit value.
    value = (value + 0x6D2B79F5) >>> 0
    let result = value

    const firstMix = result ^ (result >>> 15)
    result = Math.imul(firstMix, result | 1)

    const secondMix = result ^ (result >>> 7)
    result ^= result + Math.imul(secondMix, result | 61)

    // Divide by 2^32, not the largest integer, to keep the upper bound strictly below one.
    const unsignedResult = (result ^ (result >>> 14)) >>> 0
    return unsignedResult / 4294967296
  }
}

export function dailyCode (date = new Date()) {
  return utcDay(date)
}

/** Dates choose a map independently of screen size, locale and difficulty. */
function dateRegion (day) {
  return REGIONS[hashSeed(day) % REGIONS.length]
}

export function parseCode (value) {
  if (typeof value !== 'string') return null

  const chapter = storyStop(storyIndex(value))
  if (chapter) return { code: value, region: chapter.region.id, planning: false, story: true }

  const dated = /^(\d{4}-\d{2}-\d{2})(-hard)?$/.exec(value)
  if (!dated || !isCalendarDay(dated[1])) return null

  return {
    code: value,
    region: dateRegion(dated[1]).id,
    planning: Boolean(dated[2]),
    story: false,
    date: dated[1]
  }
}

export function normalizeCode (value) {
  return parseCode(value)?.code ?? null
}

export function puzzleDate (value) {
  return parseCode(value)?.date ?? null
}

export function isPlanningCode (code) {
  return parseCode(code)?.planning === true
}
