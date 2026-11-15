import { readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { generate, GenerationExhausted } from '../src/core/generate.js'
import { setGeography } from '../src/geo/world.js'
import { REGIONS } from '../src/content/regions.js'

setGeography(JSON.parse(gunzipSync(readFileSync(new URL('../src/data/world.geojson.gz', import.meta.url)))))
const pool = {}
const counts = new Map()
const wanted = 3
for (const region of REGIONS) {
  for (const planning of [false, true]) {
    const targets = region.id === 'NA' ? ['NA', 'CAR'] : [region.id]
    for (let seed = 0; seed < 400 && targets.some(id => (counts.get(`${id}:${planning}`) ?? 0) < wanted); seed++) {
      const code = `G2-${region.id}-${String(seed).padStart(10, '0')}${planning ? '-P' : ''}`
      try {
        const level = generate(code, { solverBudget: 300000, attemptLimit: 80 })
        const key = `${level.region}:${planning}`
        const count = counts.get(key) ?? 0
        if (count >= wanted) continue
        pool[code] = level
        counts.set(key, count + 1)
        console.log(code, level.region, level.quality.pushes, 'pushes,', level.quality.extraPushes, 'extra pushes,', level.moveCertificate.extraMoves, 'extra moves,', count + 1, '/', wanted)
      } catch (error) {
        if (!(error instanceof GenerationExhausted)) throw error
      }
    }
    for (const id of targets) if (counts.get(`${id}:${planning}`) !== wanted) throw new Error(`Incomplete fallback coverage: ${id}:${planning}`)
  }
}
writeFileSync(new URL('../src/content/fallback-levels-v4.json', import.meta.url), JSON.stringify(pool) + '\n')
console.log(`Saved ${Object.keys(pool).length} certified fallback boards.`)
