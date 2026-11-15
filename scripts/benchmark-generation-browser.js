import { chromium } from '@playwright/test'
import { createServer } from 'node:http'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve, sep, extname, dirname } from 'node:path'
import { parseArgs } from 'node:util'
import { cpus, platform, arch } from 'node:os'
import { benchmarkCodes, report } from './benchmark-utils.js'
import { replay, isSolved, validateLevel } from '../src/core/engine.js'

const { values } = parseArgs({ options: { samples: { type: 'string', default: '20' }, output: { type: 'string', default: 'docs/benchmarks/browser-worker.json' } } })
const samples = Number(values.samples)
if (!Number.isInteger(samples) || samples < 1 || samples > 1000) throw new Error('Use --samples between 1 and 1000')
const root = resolve('dist')
await readFile(resolve(root, 'index.html')).catch(() => { throw new Error('Build the application first: npm run build') })
const base = process.env.BASE_PATH && process.env.BASE_PATH !== './' ? process.env.BASE_PATH : '/'
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.gz': 'application/gzip', '.svg': 'image/svg+xml' }
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
    if (!pathname.startsWith(base)) throw new Error('Path outside application')
    const filename = resolve(root, pathname.slice(base.length) || 'index.html')
    if (!filename.startsWith(root + sep)) throw new Error('Path outside build')
    const bytes = await readFile(filename)
    response.writeHead(200, { 'Content-Type': mime[extname(filename)] ?? 'application/octet-stream' })
    response.end(bytes)
  } catch {
    response.writeHead(404)
    response.end('Not found')
  }
})
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve) })
let browser
try {
  browser = await chromium.launch()
  const page = await browser.newPage({ locale: 'en-US', reducedMotion: 'reduce' })
  await page.addInitScript(() => {
    localStorage.setItem('geosokoban.prototype.v2', JSON.stringify({ locale: 'en', reduced: true }))
    window.benchmarkReplies = []
    const NativeWorker = window.Worker
    window.Worker = class extends NativeWorker {
      constructor (url, options) {
        const started = performance.now()
        super(url, options)
        this.benchmarkStarted = started
      }

      postMessage (message, ...rest) {
        if (message?.code && message.geography) {
          const updates = []
          let finished = false
          const finish = (data, error = null) => {
            if (finished) return
            finished = true
            window.benchmarkReplies.push({ code: message.code, ms: performance.now() - this.benchmarkStarted, level: data.level, error, updates })
          }
          this.addEventListener('message', ({ data }) => {
            if (data.type === 'progress') updates.push({ ...data, ms: performance.now() - this.benchmarkStarted })
            else finish(data, data.error ? 'Generation error' : null)
          })
          this.addEventListener('error', event => finish({}, event.message || 'Worker error'))
        }
        return super.postMessage(message, ...rest)
      }
    }
  })
  await page.goto(`http://127.0.0.1:${server.address().port}${base}`)
  await page.locator('.level-selection').waitFor()
  const rows = []
  const codes = benchmarkCodes(samples)
  for (const code of codes) {
    await page.evaluate(code => { window.location.hash = `/puzzle/${encodeURIComponent(code)}?g=learn` }, code)
    try {
      // This watchdog belongs to the measuring tool, not to the application.
      await page.waitForFunction(code => window.benchmarkReplies.some(row => row.code === code), code, { timeout: 120000 })
      const received = await page.evaluate(code => window.benchmarkReplies.find(row => row.code === code), code)
      const { level, ...timing } = received
      const checked = level ? replay(level, level.solution) : null
      const ok = !!level && !validateLevel(level).length && checked.valid && isSolved(level, checked.state)
      rows.push({ ...timing, difficulty: code.endsWith('-P') ? 'puzzle' : 'gentle', ok, region: level?.region ?? null, fallback: level?.generationSource === 'fallback' })
      if (ok) {
        try {
          await page.waitForFunction(code => document.querySelector('.play-page')?.dataset.code === code, code)
        } catch (error) {
          rows.at(-1).renderError = error.message
          await page.evaluate(() => { window.location.hash = '/' })
        }
      } else await page.evaluate(() => { window.location.hash = '/' })
    } catch (error) {
      rows.push({ code, difficulty: code.endsWith('-P') ? 'puzzle' : 'gentle', ok: false, fallback: false, ms: 120000, error: error.message })
      await page.evaluate(() => { window.location.hash = '/' })
    }
    if (rows.length % 14 === 0) console.error(`${rows.length}/${codes.length} measured`)
  }
  const result = report(rows, {
    runtime: await browser.version(), userAgent: await page.evaluate(() => navigator.userAgent), platform: platform(), architecture: arch(), cpu: cpus()[0]?.model,
    samplesPerRegionAndDifficulty: samples,
    method: 'Production Vite application served over loopback HTTP without custom isolation headers. Sequential fresh native workers; measured from construction to terminal message. The map is already loaded. Worker progress messages are not terminal. No warmup samples discarded.',
    scope: 'Local desktop-browser generation timings, excluding application bootstrap, wide-area network delay, finish animation and board rendering. Not a real-phone measurement.'
  })
  const output = resolve(values.output)
  await mkdir(dirname(output), { recursive: true })
  await writeFile(output, JSON.stringify(result, null, 2) + '\n')
  console.log(JSON.stringify(result.summary, null, 2))
  console.log(`Saved ${output}`)
  if (result.summary.failed) process.exitCode = 1
} finally {
  await browser?.close()
  await new Promise(resolve => server.close(resolve))
}
