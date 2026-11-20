import { randomFrom, parseCode } from '../src/core/seed.js'
import { shiftDay } from '../src/core/dates.js'
import { REGIONS } from '../src/content/regions.js'

export function benchmarkCodes (samples = 20) {
  const rng = randomFrom('generation-benchmark-v2')
  const codes = []

  // Reuse each seed across regions and both planning modes before randomizing execution order.
  for (let sample = 0; sample < samples; sample++) {
    const day = shiftDay('2000-01-01', sample)
    for (const region of REGIONS) codes.push(`${region.slug}-${day}`, `${region.slug}-${day}-hard`)
  }

  // Draw exactly one ordering value per code so the benchmark corpus stays reproducible.
  const ordered = codes.map(code => ({ code, order: rng() }))
  ordered.sort((a, b) => a.order - b.order)

  return ordered.map(item => item.code)
}

export function summarize (rows) {
  const ok = rows.filter(row => row.ok)
  const values = ok.map(row => row.ms).sort((a, b) => a - b)

  const percentile = p => {
    if (!values.length) return null

    // Nearest-rank percentiles select an observed successful run, without interpolation.
    const rank = Math.ceil(values.length * p)
    const index = Math.max(0, rank - 1)
    return values[index]
  }

  // Latency percentiles exclude failures, but completion rates include every attempted run.
  const under500ms = rows.length ? 100 * ok.filter(row => row.ms < 500).length / rows.length : null
  const under1000ms = rows.length ? 100 * ok.filter(row => row.ms < 1000).length / rows.length : null

  return {
    attempted: rows.length,
    completed: ok.length,
    failed: rows.length - ok.length,
    fallbacks: ok.filter(row => row.fallback).length,
    medianMs: percentile(0.5),
    p75Ms: percentile(0.75),
    p80Ms: percentile(0.8),
    p95Ms: percentile(0.95),
    maxMs: values.at(-1) ?? null,
    completedUnder500msPercent: under500ms,
    completedUnder1000msPercent: under1000ms
  }
}

export function report (rows, environment) {
  return {
    schema: 1,
    corpus: 'generation-benchmark-v2',
    environment,
    summary: summarize(rows),
    byDifficulty: Object.fromEntries(['gentle', 'puzzle'].map(difficulty => {
      const matchingRows = rows.filter(row => row.difficulty === difficulty)
      return [difficulty, summarize(matchingRows)]
    })),
    byRegionAndDifficulty: Object.fromEntries(REGIONS.flatMap(region => {
      return ['gentle', 'puzzle'].map(difficulty => {
        const matchingRows = rows.filter(row =>
          parseCode(row.code)?.region === region.id && row.difficulty === difficulty)

        return [`${region.id}/${difficulty}`, summarize(matchingRows)]
      })
    })),
    rows
  }
}
