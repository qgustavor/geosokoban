import { createLevelCache, LEVEL_CACHE_KEY } from '../../src/core/level-cache.js'
import { fallbackLevel } from '../../src/core/prepare-level.js'
import { parseCode } from '../../src/core/seed.js'

/** Certified date fixtures exercise the real cache/session path without waiting for generation. */
export async function cachePuzzles (page, codes) {
  let saved
  const cache = createLevelCache({ storage: () => ({
    getItem: () => null,
    setItem: (key, value) => {
      saved = value
    }
  }) })
  const levels = codes.map(code => fallbackLevel(parseCode(code)))
  for (const level of levels) {
    if (!cache.set(level)) throw new Error(`Invalid test fixture: ${level.id}`)
  }
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), { key: LEVEL_CACHE_KEY, value: saved })
  return levels
}
