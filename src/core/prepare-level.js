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

const pools = new Map()
for (const level of Object.values(stories)) {
  const key = `${level.region}:${!!level.planning}`
  if (!pools.has(key)) pools.set(key, [])
  pools.get(key).push(level)
}
for (const choices of pools.values()) choices.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

/** The frozen pool preserves the internal region, three flags and puzzle challenge. */
export function fallbackLevel ({ code, region, planning }) {
  const choices = pools.get(`${region}:${planning}`) ?? []
  if (!choices.length) throw new Error('No matching fallback board')
  const index = hashSeed(`${code}|${MAP_VERSION}|${GENERATOR_VERSION}|fallback-${FALLBACK_VERSION}`) % choices.length
  const source = choices[index]
  const level = { ...varyCertifiedLayout(source, code), id: code, generatorVersion: GENERATOR_VERSION, generationSource: 'fallback', fallbackId: source.id, fallbackVersion: FALLBACK_VERSION }
  const checked = replay(level, level.solution)
  if (validateLevel(level).length || !checked.valid || !isSolved(level, checked.state)) throw new Error('Invalid fallback certificate')
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
