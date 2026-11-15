import { Worker } from 'node:worker_threads'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { cpus, platform, arch, availableParallelism } from 'node:os'
import { performance } from 'node:perf_hooks'
import { parseArgs } from 'node:util'
import { isSolved, replay, validateLevel } from '../src/core/engine.js'
import { benchmarkCodes, report } from './benchmark-utils.js'

const { values } = parseArgs({ options: { samples: { type: 'string', default: '20' }, output: { type: 'string', default: 'docs/benchmarks/node-worker.json' } } })
const samples = Number(values.samples)
if (!Number.isInteger(samples) || samples < 1 || samples > 1000) throw new Error('Use --samples between 1 and 1000 per region and difficulty')
const geography = JSON.parse(gunzipSync(readFileSync(new URL('../src/data/world.geojson.gz', import.meta.url))))

function measure (code) {
  return new Promise(resolve => {
    const started = performance.now()
    const worker = new Worker(new URL('./benchmark-worker.js', import.meta.url))
    const updates = []
    let settled = false
    const finish = (data = {}, error = null) => {
      if (settled) return
      settled = true
      const ms = performance.now() - started
      clearTimeout(watchdog)
      worker.terminate()
      const level = data.level
      const checked = level ? replay(level, level.solution) : null
      const valid = !!level && !validateLevel(level).length && checked.valid && isSolved(level, checked.state)
      resolve({
        code,
        difficulty: code.endsWith('-P') ? 'puzzle' : 'gentle',
        ms,
        ok: valid,
        fallback: level?.generationSource === 'fallback',
        region: level?.region ?? null,
        optimalMoves: level?.moveCertificate?.optimalMoves ?? null,
        obstacleFreeMoves: level?.moveCertificate?.obstacleFreeMoves ?? null,
        extraMoves: level?.moveCertificate?.extraMoves ?? null,
        error: error?.message ?? (!valid ? 'Missing or invalid level' : null),
        updates
      })
    }
    // Timeouts are retained as failed samples, never counted as fast successful runs.
    const watchdog = setTimeout(() => finish({}, new Error('Benchmark watchdog: 120 seconds')), 120000)
    worker.on('message', data => {
      if (data.type === 'progress') updates.push({ ...data, ms: performance.now() - started })
      else finish(data)
    })
    worker.on('error', error => finish({}, error))
    worker.on('exit', code => { if (!settled) finish({}, new Error(`Worker exited: ${code}`)) })
    worker.postMessage({ code, geography })
  })
}

const rows = []
const codes = benchmarkCodes(samples)
for (const code of codes) {
  rows.push(await measure(code))
  if (rows.length % 14 === 0) console.error(`${rows.length}/${codes.length} measured`)
}
const result = report(rows, {
  generatorVersion: 4,
  minimumExtraMoves: 5,
  runtime: `Node ${process.version}`,
  platform: platform(),
  architecture: arch(),
  cpu: cpus()[0]?.model,
  availableParallelism: availableParallelism(),
  samplesPerRegionAndDifficulty: samples,
  method: 'Sequential fresh Node workers running the exact generation-worker source through a parentPort adapter. Includes worker startup, imports, geography structured cloning and the reply. Excludes application startup, network transfer and board rendering. No warmup samples discarded.',
  scope: 'Development-machine measurements only, not player-device or browser percentiles.'
})
const output = resolve(values.output)
mkdirSync(dirname(output), { recursive: true })
writeFileSync(output, JSON.stringify(result, null, 2) + '\n')
console.log(JSON.stringify(result.summary, null, 2))
console.log(`Saved ${output}`)
if (result.summary.failed) process.exitCode = 1
