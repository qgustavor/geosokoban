import { randomFrom } from '../src/core/seed.js'
import { REGIONS } from '../src/content/regions.js'

export function benchmarkCodes (samples = 20) {
  const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
  const rng = randomFrom('generation-benchmark-v1')
  const codes = []
  for (let sample = 0; sample < samples; sample++) {
    const seed = Array.from({ length: 10 }, () => alphabet[Math.floor(rng() * alphabet.length)]).join('')
    for (const region of REGIONS) codes.push(`G2-${region.id}-${seed}`, `G2-${region.id}-${seed}-P`)
  }
  return codes.map(code => ({ code, order: rng() })).sort((a, b) => a.order - b.order).map(item => item.code)
}

export function summarize (rows) {
  const ok = rows.filter(row => row.ok)
  const values = ok.map(row => row.ms).sort((a, b) => a - b)
  const percentile = p => values.length ? values[Math.max(0, Math.ceil(values.length * p) - 1)] : null
  return {
    attempted: rows.length, completed: ok.length, failed: rows.length - ok.length,
    fallbacks: ok.filter(row => row.fallback).length,
    medianMs: percentile(0.5), p75Ms: percentile(0.75), p80Ms: percentile(0.8), p95Ms: percentile(0.95), maxMs: values.at(-1) ?? null,
    completedUnder500msPercent: rows.length ? 100 * ok.filter(row => row.ms < 500).length / rows.length : null,
    completedUnder1000msPercent: rows.length ? 100 * ok.filter(row => row.ms < 1000).length / rows.length : null
  }
}

export function report (rows, environment) {
  return {
    schema: 1, corpus: 'generation-benchmark-v1', environment, summary: summarize(rows),
    byDifficulty: Object.fromEntries(['gentle', 'puzzle'].map(difficulty => [difficulty, summarize(rows.filter(row => row.difficulty === difficulty))])),
    byRegionAndDifficulty: Object.fromEntries(REGIONS.flatMap(region => ['gentle', 'puzzle'].map(difficulty => [
      `${region.id}/${difficulty}`, summarize(rows.filter(row => row.code.split('-')[1] === region.id && row.difficulty === difficulty))
    ]))), rows
  }
}
