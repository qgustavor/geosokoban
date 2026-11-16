import { validMoveCertificate } from './difficulty.js'
import { generate, GenerationExhausted, GENERATOR_VERSION } from './generate.js'
import { hashSeed } from './seed.js'
import { MAP_VERSION } from '../geo/rasterize.js'
import { validateLevel, replay, isSolved } from './engine.js'
import { analyzeDesign, meetsDesign } from './design-quality.js'
import stories from '../content/fallback-levels-v5.json' with { type: 'json' }

import { FALLBACK_VERSION } from './generation-version.js'
import { varyCertifiedLayout } from './layout-variation.js'

export { FALLBACK_VERSION } from './generation-version.js'

// A fallback must retain both the selected internal region and its planning rules.
const pools = new Map()
for (const level of Object.values(stories)) {
  const key = `${level.region}:${!!level.planning}`
  if (!pools.has(key)) pools.set(key, [])

  pools.get(key).push(level)
}

// Sort by code-unit order rather than locale so a seed chooses the same template on every machine.
for (const choices of pools.values()) {
  choices.sort((a, b) => {
    if (a.id < b.id) return -1
    if (a.id > b.id) return 1

    return 0
  })
}

/** The frozen pool preserves the internal region, three flags and puzzle challenge. */
export function fallbackLevel ({ code, region, planning }) {
  const choices = pools.get(`${region}:${planning}`) ?? []
  if (!choices.length) throw new Error('No matching fallback board')

  // Include all relevant revisions so a template-pool update does not masquerade as an older board.
  const selectionSeed = `${code}|${MAP_VERSION}|${GENERATOR_VERSION}|fallback-${FALLBACK_VERSION}`
  const index = hashSeed(selectionSeed) % choices.length
  const source = choices[index]
  const level = {
    ...varyCertifiedLayout(source, code),
    id: code,
    generatorVersion: GENERATOR_VERSION,
    generationSource: 'fallback',
    fallbackId: source.id,
    fallbackVersion: FALLBACK_VERSION
  }

  // Recheck the varied board, not just its stored template: the existing solutions must still be legal.
  const checked = replay(level, level.solution)
  const hasLayoutErrors = validateLevel(level).length > 0
  if (hasLayoutErrors || !checked.valid || !isSolved(level, checked.state)) {
    throw new Error('Invalid fallback certificate')
  }

  const quality = analyzeDesign(level, level.designSolution)
  if (!validMoveCertificate(level)) throw new Error('Invalid fallback move certificate')
  if (!meetsDesign(quality, planning)) throw new Error('Invalid fallback design')

  return level
}

/** Only bounded-search exhaustion selects a fallback; technical errors remain errors. */
export function prepareLevel (code, { onProgress = () => {}, generator = generate } = {}) {
  try {
    return generator(code, { onProgress })
  } catch (error) {
    if (!(error instanceof GenerationExhausted)) throw error

    const level = fallbackLevel(error)
    onProgress({ stage: 'ready' })

    return level
  }
}
