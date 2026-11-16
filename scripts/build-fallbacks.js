import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { gunzipSync } from 'node:zlib'
import { generate, GenerationExhausted } from '../src/core/generate.js'
import { setGeography } from '../src/geo/world.js'
import { REGIONS } from '../src/content/regions.js'

const worldBytes = readFileSync(new URL('../src/data/world.geojson.gz', import.meta.url))
setGeography(JSON.parse(gunzipSync(worldBytes)))

const { values } = parseArgs({ options: { resume: { type: 'boolean', default: false } } })
const output = new URL('../src/content/fallback-levels-v5.json', import.meta.url)
const pool = values.resume && existsSync(output) ? JSON.parse(readFileSync(output, 'utf8')) : {}

const counts = new Map()
for (const level of Object.values(pool)) {
  const key = `${level.region}:${level.planning}`
  counts.set(key, (counts.get(key) ?? 0) + 1)
}

const wanted = 3

for (const region of REGIONS) {
  for (const planning of [false, true]) {
    // North America codes can generate Caribbean boards, which need their own fallback quota.
    const targets = region.id === 'NA' ? ['NA', 'CAR'] : [region.id]
    for (let seed = 0; seed < 800 && targets.some(id => (counts.get(`${id}:${planning}`) ?? 0) < wanted); seed++) {
      const code = `G2-${region.id}-${String(seed).padStart(10, '0')}${planning ? '-P' : ''}`
      if (pool[code]) continue

      try {
        const level = generate(code, { solverBudget: 300000, attemptLimit: 80 })
        const key = `${level.region}:${planning}`
        const count = counts.get(key) ?? 0
        if (count >= wanted) continue

        // Limit repeats of one motif so the small pool retains structural variety.
        const sameMotif = Object.values(pool).filter(other =>
          other.region === level.region && other.planning === planning && other.motif === level.motif)
        if (sameMotif.length >= 2) continue

        pool[code] = level
        counts.set(key, count + 1)
        // Checkpoint every accepted board so --resume can keep completed certification work.
        writeFileSync(output, JSON.stringify(pool) + '\n')
        console.log(
          code, level.region, level.quality.pushes, 'pushes,', level.quality.extraPushes,
          'extra pushes,', level.moveCertificate.extraMoves, 'extra moves,', count + 1, '/', wanted
        )
      } catch (error) {
        if (!(error instanceof GenerationExhausted)) throw error
      }
    }

    for (const id of targets) {
      if (counts.get(`${id}:${planning}`) !== wanted) {
        throw new Error(`Incomplete fallback coverage: ${id}:${planning}`)
      }
    }
  }
}

writeFileSync(output, JSON.stringify(pool) + '\n')
console.log(`Saved ${Object.keys(pool).length} certified fallback boards.`)
