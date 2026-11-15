import { validMoveCertificate } from './difficulty.js'
import { generate, GenerationExhausted, GENERATOR_VERSION } from './generate.js'
import { hashSeed } from './seed.js'
import { MAP_VERSION } from '../geo/rasterize.js'
import { validateLevel, replay, isSolved } from './engine.js'
import { analyzeDesign, meetsDesign } from './design-quality.js'
import stories from '../content/fallback-levels-v4.json' with { type: 'json' }

export const FALLBACK_VERSION = 4

/** The frozen pool preserves the internal region, three flags and puzzle challenge. */
export function fallbackLevel ({ code, region, planning }) {
  const choices = Object.values(stories).filter(level =>
    level.region === region && !!level.planning === planning && level.boxes.length === 3
  ).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  if (!choices.length) throw new Error('No matching fallback board')
  const index = hashSeed(`${code}|${MAP_VERSION}|${GENERATOR_VERSION}|fallback-${FALLBACK_VERSION}`) % choices.length
  const source = choices[index]
  const level = { ...structuredClone(source), id: code, generationSource: 'fallback', fallbackId: source.id, fallbackVersion: FALLBACK_VERSION }
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
