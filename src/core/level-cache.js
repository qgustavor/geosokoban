import { normalizeCode } from './seed.js'
import { GENERATOR_VERSION, FALLBACK_VERSION } from './generation-version.js'
import { MAP_VERSION } from '../geo/rasterize.js'
import { validateLevel, replay, isSolved } from './engine.js'
import { validMoveCertificate } from './difficulty.js'

export const LEVEL_CACHE_KEY = 'geosokoban.level-cache'
export const LEVEL_CACHE_VERSION = `1:${MAP_VERSION}:${GENERATOR_VERSION}:${FALLBACK_VERSION}`

/** Cached files are untrusted input; never let corrupt storage break starting a game. */
export function cacheableLevel (code, level) {
  try {
    if (!level || normalizeCode(code) !== code || level.id !== code) return false

    // Matching IDs alone do not make an older map or generator's board reusable.
    const currentVersions = level.generatorVersion === GENERATOR_VERSION && level.mapVersion === MAP_VERSION
    if (!currentVersions) return false

    const region = code.split('-')[1]

    // North America codes can select the internal Caribbean map; other regions
    // must match exactly rather than accepting a board from a different pool.
    if (level.region !== region && !(region === 'NA' && level.region === 'CAR')) return false
    if (!!level.planning !== code.endsWith('-P')) return false

    const boundedDimensions = [level.width, level.height].every(size =>
      Number.isInteger(size) && size > 0 && size <= 128
    )
    if (!boundedDimensions) return false
    if (!Array.isArray(level.solution) || level.solution.length > 10000 || validateLevel(level).length) return false

    // Stored metadata is not sufficient: replay the solution and verify its
    // accompanying move certificate before exposing the level to a session.
    const checked = replay(level, level.solution)
    return checked.valid && isSolved(level, checked.state) && validMoveCertificate(level)
  } catch {
    return false
  }
}

/** Bounded LRU, clone-on-read/write, with optional best-effort persistence. */
export function createLevelCache ({
  storage = () => globalThis.localStorage,
  maxEntries = 24,
  maxCharacters = 750000
} = {}) {
  const invalidCapacity = !Number.isSafeInteger(maxEntries) || maxEntries < 1 ||
    !Number.isSafeInteger(maxCharacters) || maxCharacters < 1
  if (invalidCapacity) throw new RangeError('Invalid cache capacity')

  const entries = new Map()
  let loaded = false

  function load () {
    if (loaded) return

    // Try storage once per instance, even when access is disabled or corrupt.
    // Subsequent operations must still work against the in-memory cache.
    loaded = true

    try {
      const text = storage()?.getItem(LEVEL_CACHE_KEY)
      if (!text || text.length > maxCharacters) return

      const saved = JSON.parse(text)
      if (saved.version !== LEVEL_CACHE_VERSION || !Array.isArray(saved.entries)) return

      // Persisted insertion order runs oldest to newest. Keep the newest tail;
      // expensive board validation is deferred until a particular entry is read.
      for (const entry of saved.entries.slice(-maxEntries)) {
        const validEntry = Array.isArray(entry) && entry.length === 2 && typeof entry[0] === 'string'
        if (validEntry) entries.set(entry[0], entry[1])
      }
    } catch {
      // Disabled storage and malformed JSON are cache misses.
    }
  }

  function persist () {
    try {
      const target = storage()
      if (!target) return

      const saved = [...entries]

      // A full origin quota must not prevent playing. Try a smaller disk cache;
      // keep all in-memory entries even when persistent storage is unavailable.
      while (saved.length) {
        const text = JSON.stringify({ version: LEVEL_CACHE_VERSION, entries: saved })

        if (text.length <= maxCharacters) {
          try {
            target.setItem(LEVEL_CACHE_KEY, text)
            return
          } catch {
            // Retry after removing the oldest entry from the disk snapshot.
          }
        }

        saved.shift()
      }

      target.removeItem(LEVEL_CACHE_KEY)
    } catch {
      // localStorage access itself can throw in private or restricted contexts.
    }
  }

  return {
    get (input) {
      const code = normalizeCode(input)
      if (!code) return null

      load()
      const level = entries.get(code)
      if (!level) return null

      if (!cacheableLevel(code, level)) {
        entries.delete(code)
        persist()
        return null
      }

      // Reinsert to mark this entry most recently used. Reads update memory
      // ordering without forcing a disk write, and callers receive their own copy.
      entries.delete(code)
      entries.set(code, level)
      return structuredClone(level)
    },
    set (level) {
      if (!cacheableLevel(level?.id, level)) return false

      load()
      entries.delete(level.id)
      entries.set(level.id, structuredClone(level))

      // Map insertion order makes the first key the least recently used entry.
      while (entries.size > maxEntries) entries.delete(entries.keys().next().value)

      persist()
      return true
    },
    clear () {
      // Prevent a later read from reloading old data if disk removal fails.
      loaded = true
      entries.clear()

      try {
        storage()?.removeItem(LEVEL_CACHE_KEY)
      } catch {
        // Clearing memory must still succeed when persistent storage is unavailable.
      }
    },
    get size () {
      load()
      return entries.size
    }
  }
}
