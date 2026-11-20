import { utcDay, isCalendarDay } from './dates.js'
import { REGIONS } from '../content/regions.js'

// Short, familiar words are easier to dictate than a string of ambiguous letters.
// These are seed tokens, not UI translations: changing language must not change a puzzle.
const ADJECTIVES = [
  'amber', 'blue', 'brave', 'bright', 'calm', 'clear', 'cool', 'coral',
  'cozy', 'fair', 'fresh', 'gentle', 'golden', 'green', 'happy', 'kind',
  'little', 'lucky', 'mellow', 'merry', 'misty', 'pale', 'quiet', 'rosy',
  'silver', 'snowy', 'soft', 'sunny', 'tiny', 'warm', 'wild', 'young'
]
const NOUNS = [
  'bay', 'bird', 'bloom', 'boat', 'brook', 'cloud', 'cove', 'dawn',
  'dune', 'fern', 'field', 'finch', 'forest', 'garden', 'hill', 'island',
  'kite', 'lake', 'leaf', 'moon', 'moss', 'otter', 'panda', 'pearl',
  'rain', 'reef', 'river', 'shell', 'star', 'sun', 'trail', 'wave'
]

export function hashSeed (text) {
  let hash = 2166136261

  // Keep UTF-16 code units and 32-bit multiplication: changing either changes existing puzzle seeds.
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

/** Dates, not viewport dimensions, choose the region and generated board. */
export function dateRegion (day) {
  return REGIONS[hashSeed(day.replaceAll('-', '')) % REGIONS.length]
}

/** Also recognizes old date fixtures so a future-day link cannot bypass the route guard. */
export function puzzleDate (value) {
  if (typeof value !== 'string') return null
  const dated = /(?:^|-)(\d{4}-\d{2}-\d{2})(?:-hard)?$/i.exec(value)
  if (dated && isCalendarDay(dated[1])) return dated[1]
  const fixture = /-D(\d{4})(\d{2})(\d{2})(?:-P)?$/i.exec(value)
  const day = fixture ? `${fixture[1]}-${fixture[2]}-${fixture[3]}` : ''
  return isCalendarDay(day) ? day : null
}

export function newCode (region = null) {
  const bytes = new Uint32Array(4)
  globalThis.crypto.getRandomValues(bytes)

  const chosen = REGIONS.find(item => item.id === region) ?? REGIONS[bytes[3] % REGIONS.length]
  const adjective = ADJECTIVES[bytes[0] % ADJECTIVES.length]
  const noun = NOUNS[bytes[1] % NOUNS.length]
  const number = 10 + bytes[2] % 90

  return `${chosen.slug}-${adjective}-${noun}-${number}`
}

function calendarDate (year, month, day) {
  const iso = `${year}-${month}-${day}`
  const date = new Date(`${iso}T00:00:00Z`)

  // JavaScript rolls some invalid days into the next month; require an exact round trip.
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === iso
}

/** Parse once, rather than making callers infer region and difficulty from hyphen positions. */
export function parseCode (value) {
  if (typeof value !== 'string') return null

  const input = value.trim()
  const dated = /^(\d{4}-\d{2}-\d{2})(-hard)?$/i.exec(input)
  if (dated) {
    const day = dated[1]
    if (!isCalendarDay(day)) return null
    return { code: input.toLowerCase(), region: dateRegion(day).id, planning: !!dated[2], tour: 0 }
  }
  const legacy = /^G2-(SA|NA|EE|WE|AF|AS|OC)-([^-]+)(-P)?$/i.exec(input)

  // Retain the frozen asset/test codes without imposing a version on new share codes.
  if (legacy) {
    const token = legacy[2].toUpperCase()
    const daily = /^D(\d{4})(\d{2})(\d{2})$/.exec(token)
    const tour = /^S([1-3])$/.exec(token)
    const valid = daily
      ? calendarDate(daily[1], daily[2], daily[3])
      : !!tour || /^[0-9A-HJKMNP-TV-Z]{10}$/.test(token)
    if (!valid) return null

    return {
      code: input.toUpperCase(),
      region: legacy[1].toUpperCase(),
      planning: !!legacy[3],
      tour: Number(tour?.[1] ?? 0)
    }
  }

  // Spaces and underscores are accepted when a code is copied from a note or dictated.
  const code = input.toLowerCase().replace(/[\s_]+/g, '-')
  const planning = code.endsWith('-hard')
  const base = planning ? code.slice(0, -5) : code
  const region = REGIONS.find(item => base.startsWith(`${item.slug}-`))
  if (!region) return null

  const token = base.slice(region.slug.length + 1)
  const tour = /^tour-([1-3])$/.exec(token)
  const daily = /^(\d{4})-(\d{2})-(\d{2})$/.exec(token)
  const words = /^([a-z]+)-([a-z]+)-([1-9]\d)$/.exec(token)
  const validWords = words && ADJECTIVES.includes(words[1]) && NOUNS.includes(words[2])
  const valid = daily ? calendarDate(daily[1], daily[2], daily[3]) : !!tour || validWords
  if (!valid) return null

  return { code, region: region.id, planning, tour: Number(tour?.[1] ?? 0) }
}

export function normalizeCode (value) {
  return parseCode(value)?.code ?? null
}

export function isPlanningCode (code) {
  return parseCode(code)?.planning === true
}
