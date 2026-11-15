import { REGIONS } from '../content/regions.js'

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

export function hashSeed (text) {
  let hash = 2166136261
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
    value = (value + 0x6D2B79F5) >>> 0
    let result = value
    result = Math.imul(result ^ result >>> 15, result | 1)
    result ^= result + Math.imul(result ^ result >>> 7, result | 61)
    return ((result ^ result >>> 14) >>> 0) / 4294967296
  }
}

export function dailyCode (date = new Date()) {
  const day = date.toISOString().slice(0, 10).replaceAll('-', '')
  const region = REGIONS[hashSeed(day) % REGIONS.length].id
  return `G2-${region}-D${day}`
}

export function newCode (region = null) {
  const bytes = new Uint8Array(11)
  globalThis.crypto.getRandomValues(bytes)
  const chosen = REGIONS.some(item => item.id === region) ? region : REGIONS[bytes[10] % REGIONS.length].id
  return `G2-${chosen}-${Array.from(bytes.slice(0, 10), byte => ALPHABET[byte & 31]).join('')}`
}

export function normalizeCode (value) {
  const code = String(value).trim().toUpperCase()
  const match = /^G2-(SA|NA|EE|WE|AF|AS|OC)-([^-]+)(?:-P)?$/.exec(code)
  if (!match) return null
  const daily = /^D(\d{4})(\d{2})(\d{2})$/.exec(match[2])
  if (daily) {
    const iso = `${daily[1]}-${daily[2]}-${daily[3]}`
    const date = new Date(`${iso}T00:00:00Z`)
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === iso ? code : null
  }
  return /^(?:[0-9A-HJKMNP-TV-Z]{10}|S[1-3])$/.test(match[2]) ? code : null
}
