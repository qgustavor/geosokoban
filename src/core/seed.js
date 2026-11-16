import { REGIONS } from '../content/regions.js'

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

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
  // Use the UTC date so the same instant selects the same daily puzzle in every timezone.
  const day = date.toISOString().slice(0, 10).replaceAll('-', '')
  const regionIndex = hashSeed(day) % REGIONS.length
  const region = REGIONS[regionIndex].id

  return `G2-${region}-D${day}`
}

export function newCode (region = null) {
  const bytes = new Uint8Array(11)
  globalThis.crypto.getRandomValues(bytes)

  // The last byte selects a region only when the caller has not supplied a recognized one.
  const hasRequestedRegion = REGIONS.some(item => item.id === region)
  const chosen = hasRequestedRegion ? region : REGIONS[bytes[10] % REGIONS.length].id
  // Five bits address the share-code alphabet; the first ten bytes supply the puzzle's seed text.
  const seedText = Array.from(bytes.slice(0, 10), byte => ALPHABET[byte & 31]).join('')

  return `G2-${chosen}-${seedText}`
}

export function normalizeCode (value) {
  const code = String(value).trim().toUpperCase()
  const match = /^G2-(SA|NA|EE|WE|AF|AS|OC)-([^-]+)(?:-P)?$/.exec(code)
  if (!match) return null

  const daily = /^D(\d{4})(\d{2})(\d{2})$/.exec(match[2])
  if (daily) {
    const iso = `${daily[1]}-${daily[2]}-${daily[3]}`
    const date = new Date(`${iso}T00:00:00Z`)

    // Date parsing can roll an out-of-range day into the next month; require an exact round trip.
    const isCalendarDate = !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === iso
    return isCalendarDate ? code : null
  }

  const isRandomOrStorySeed = /^(?:[0-9A-HJKMNP-TV-Z]{10}|S[1-3])$/.test(match[2])

  return isRandomOrStorySeed ? code : null
}
