import { readFile, writeFile, mkdir, rename, stat, unlink } from 'node:fs/promises'
import { watch } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { gunzipSync } from 'node:zlib'
import { setGeography } from '../src/geo/world.js'
import { rasterize } from '../src/geo/rasterize.js'
import { geographyReference } from './lib/tiled-reference.js'
import { normalizeCode } from '../src/core/seed.js'
import { generate } from '../src/core/generate.js'
import { storyIndex } from '../src/content/regions.js'
import { initialState } from '../src/core/engine.js'
import { solve } from '../src/core/solver.js'
import { toTiled, fromTiled } from '../src/core/tiled.js'

const USAGE = 'Usage: node scripts/level-editor.js export CODE [output.tmj] | import <input.tmj | dir> [output.json | outputDir | --story] [--watch]'

const storyPath = fileURLToPath(new URL('../src/content/story-levels.json', import.meta.url))
const worldBytes = await readFile(new URL('../src/data/world.geojson.gz', import.meta.url))
setGeography(JSON.parse(gunzipSync(worldBytes)))

function timestamp () {
  return new Date().toLocaleTimeString('en-GB', { hour12: false })
}

async function writeJsonAtomic (filePath, content) {
  const dir = dirname(filePath)
  await mkdir(dir, { recursive: true })
  const tmpPath = join(dir, `.${basename(filePath)}.${process.pid}.tmp`)
  try {
    await writeFile(tmpPath, content)
    await rename(tmpPath, filePath)
  } catch (error) {
    await unlink(tmpPath).catch(() => {})
    throw error
  }
}

function validateAndSolve (rawTmj) {
  const level = fromTiled(JSON.parse(rawTmj))
  if (!normalizeCode(level.id)) throw new Error('Invalid puzzle code in map properties')

  const result = solve(level, initialState(level), 50000)
  if (result.status !== 'solved') {
    // Budget exhaustion is not proof that an edited puzzle has no solution.
    const reason = result.status === 'unsolvable'
      ? 'The edited puzzle is unsolvable'
      : 'No solution found within the search budget; solvability is unknown'

    throw new Error(reason)
  }

  return { ...level, solution: result.moves }
}

async function importLevelFromSource (rawTmj, tmjPath, { story, outputPath, outputDir }) {
  const certified = validateAndSolve(rawTmj)

  if (story) {
    if (!storyIndex(certified.id)) throw new Error('Add the chapter to STORY_ITINERARY before importing it')
    if (certified.planning) throw new Error('Story chapters do not have hard variants')
    const stories = JSON.parse(await readFile(storyPath, 'utf8'))
    stories[certified.id] = certified
    await writeJsonAtomic(storyPath, JSON.stringify(stories) + '\n')
    return {
      moves: certified.solution.length,
      message: `Saved ${certified.id} to story content`
    }
  }

  const destination = outputPath || (outputDir
    ? join(outputDir, basename(tmjPath).replace(/\.tmj$/, '') + '.level.json')
    : tmjPath.replace(/\.tmj$/, '') + '.level.json')

  await writeJsonAtomic(destination, JSON.stringify(certified, null, 2) + '\n')
  return {
    moves: certified.solution.length,
    message: destination
  }
}

async function resolveImportTarget (input, option, isWatch) {
  const resolvedInput = resolve(input)
  const inputStat = await stat(resolvedInput)

  if (inputStat.isDirectory()) {
    if (!isWatch) throw new Error('Directory input is only supported with --watch')
    if (option && option.endsWith('.json')) {
      throw new Error('Cannot write multiple watched levels to a single JSON file; pass an output directory or --story')
    }
    return {
      isDir: true,
      resolvedInput,
      outputDir: option ? resolve(option) : null,
      outputPath: null
    }
  }

  if (!inputStat.isFile()) throw new Error(`Unsupported input path: ${input}`)

  let outputDir = null
  let outputPath = null
  if (option) {
    const resolvedOption = resolve(option)
    const optionStat = await stat(resolvedOption).catch(() => null)
    if (optionStat?.isDirectory()) outputDir = resolvedOption
    else outputPath = resolvedOption
  }

  return { isDir: false, resolvedInput, outputDir, outputPath }
}

async function watchLevels (target, { story }) {
  const { isDir, resolvedInput, outputDir, outputPath } = target
  const watchDir = isDir ? resolvedInput : dirname(resolvedInput)
  const targetFile = isDir ? null : basename(resolvedInput)

  const timers = new Map()
  const queued = new Set()
  const lastContents = new Map()
  let closed = false
  let queue = Promise.resolve()

  async function processFile (filePath) {
    let raw
    try {
      raw = await readFile(filePath, 'utf8')
    } catch (error) {
      if (error?.code === 'ENOENT') {
        lastContents.delete(filePath)
        return
      }
      console.error(`[${timestamp()}] ✗ ${basename(filePath)}: ${error.message}`)
      return
    }

    if (raw === lastContents.get(filePath)) return
    lastContents.set(filePath, raw)

    const start = performance.now()
    try {
      const info = await importLevelFromSource(raw, filePath, { story, outputDir, outputPath })
      const elapsedMs = Math.round(performance.now() - start)
      console.log(`[${timestamp()}] ✓ ${info.message} (${info.moves} moves, ${elapsedMs}ms)`)
    } catch (error) {
      console.error(`[${timestamp()}] ✗ ${basename(filePath)}: ${error.message}`)
    }
  }

  function enqueue (filePath) {
    if (closed || queued.has(filePath)) return
    queued.add(filePath)
    queue = queue.then(async () => {
      queued.delete(filePath)
      if (!closed) await processFile(filePath)
    })
  }

  function schedule (filePath) {
    if (closed) return
    const existing = timers.get(filePath)
    if (existing) clearTimeout(existing)
    timers.set(filePath, setTimeout(() => {
      timers.delete(filePath)
      enqueue(filePath)
    }, 150))
  }

  if (!isDir) {
    enqueue(resolvedInput)
    await queue
  }

  const watcher = watch(watchDir, (_eventType, filename) => {
    if (closed) return
    if (!filename) {
      if (targetFile) schedule(resolvedInput)
      return
    }
    const name = String(filename)
    if (targetFile) {
      if (name !== targetFile) return
    } else if (!name.endsWith('.tmj')) {
      return
    }
    schedule(join(watchDir, name))
  })

  watcher.on('error', (error) => {
    console.error(`[${timestamp()}] Watcher error: ${error.message}`)
  })

  const shutdown = async () => {
    if (closed) return
    closed = true
    for (const timer of timers.values()) clearTimeout(timer)
    timers.clear()
    watcher.close()
    await queue.catch(() => {})
    console.log('\nStopped watching.')
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  console.log(`Watching ${resolvedInput} for changes (Ctrl+C to stop)...`)
}

try {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      watch: { type: 'boolean', short: 'w', default: false },
      story: { type: 'boolean', default: false }
    },
    allowPositionals: true
  })

  const [operation, input, option, ...extra] = positionals
  if (extra.length > 0) throw new Error(USAGE)

  if (operation === 'export') {
    if (values.watch || values.story) throw new Error(USAGE)
    const code = normalizeCode(input)
    if (!code) throw new Error('Supply a story chapter ID or a dated puzzle code')

    const stories = JSON.parse(await readFile(storyPath, 'utf8'))

    // Preserve curated story boards; only codes without stored content invoke generation.
    if (storyIndex(code) && !stories[code]) throw new Error('Missing authored story board')

    const level = stories[code] ?? generate(code)
    const output = resolve(option ?? `levels/editable/${code}.tmj`)
    await mkdir(dirname(output), { recursive: true })
    if (level.sea) {
      const map = rasterize(level.region, level.threshold)
      const image = resolve(dirname(output), `geography-${level.region}.svg`)
      await writeFile(image, geographyReference(map))
    }
    await writeFile(output, JSON.stringify(toTiled(level), null, 2) + '\n')
    await writeFile(resolve(dirname(output), 'terrain.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="40"><rect width="40" height="40" rx="4" fill="#e4e8bb"/><rect x="40" width="40" height="40" rx="4" fill="#e4e8bb"/><path d="m43 33 16-27 18 27z" fill="#809787"/><path d="m59 6-6 11 6-2 5 2z" fill="#fff7df"/></svg>\n')
    console.log(output)
  } else if (operation === 'import') {
    if (!input || (values.story && option)) throw new Error(USAGE)

    const target = await resolveImportTarget(input, option, values.watch)
    if (values.watch) {
      await watchLevels(target, { story: values.story })
    } else {
      const raw = await readFile(target.resolvedInput, 'utf8')
      const info = await importLevelFromSource(raw, target.resolvedInput, {
        story: values.story,
        outputDir: target.outputDir,
        outputPath: target.outputPath
      })
      console.log(info.message)
    }
  } else {
    throw new Error(USAGE)
  }
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
