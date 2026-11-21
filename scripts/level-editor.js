import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { setGeography } from '../src/geo/world.js'
import { rasterize, countryAt } from '../src/geo/rasterize.js'
import { normalizeCode } from '../src/core/seed.js'
import { generate } from '../src/core/generate.js'
import { storyIndex } from '../src/content/regions.js'
import { initialState } from '../src/core/engine.js'
import { solve } from '../src/core/solver.js'
import { toTiled, fromTiled } from '../src/core/tiled.js'

const storyPath = new URL('../src/content/story-levels.json', import.meta.url)
const stories = JSON.parse(await readFile(storyPath, 'utf8'))
const worldBytes = await readFile(new URL('../src/data/world.geojson.gz', import.meta.url))
setGeography(JSON.parse(gunzipSync(worldBytes)))

const [operation, input, option] = process.argv.slice(2)

try {
  if (operation === 'export') {
    const code = normalizeCode(input)
    if (!code) throw new Error('Supply a story chapter ID or a dated puzzle code')

    // Preserve curated story boards; only codes without stored content invoke generation.
    if (storyIndex(code) && !stories[code]) throw new Error('Missing authored story board')
    const level = stories[code] ?? generate(code)
    const output = resolve(option ?? `levels/editable/${code}.tmj`)
    await mkdir(dirname(output), { recursive: true })
    await writeFile(output, JSON.stringify(toTiled(level), null, 2) + '\n')
    await writeFile(resolve(dirname(output), 'terrain.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="40"><rect width="40" height="40" rx="4" fill="#e4e8bb"/><rect x="40" width="40" height="40" rx="4" fill="#e4e8bb"/><path d="m43 33 16-27 18 27z" fill="#809787"/><path d="m59 6-6 11 6-2 5 2z" fill="#fff7df"/></svg>\n')
    console.log(output)
  } else if (operation === 'import') {
    const level = fromTiled(JSON.parse(await readFile(resolve(input), 'utf8')))
    if (!normalizeCode(level.id)) throw new Error('Invalid puzzle code in map properties')

    const map = rasterize(level.region, level.threshold)
    if (level.width !== map.width || level.height !== map.height) throw new Error('Preserve the region dimensions')

    // Tiled uses cell positions; country containment is tested at each cell's center.
    for (const goal of level.goals) {
      const x = goal.position % level.width + 0.5
      const y = Math.floor(goal.position / level.width) + 0.5
      if (!level.sea && countryAt(map, x, y) !== goal.country) throw new Error(`Target is outside ${goal.country}`)
      if (level.sea) {
        // Offshore goals need a nearby country anchor, but must themselves remain on water.
        const invalidDock = countryAt(map, x, y) || !goal.anchor ||
          Math.hypot(x - goal.anchor[0], y - goal.anchor[1]) > 2.8

        if (invalidDock) throw new Error(`Invalid offshore dock for ${goal.country}`)
      }
    }

    const result = solve(level, initialState(level), 50000)
    if (result.status !== 'solved') {
      // Budget exhaustion is not proof that an edited puzzle has no solution.
      const reason = result.status === 'unsolvable'
        ? 'The edited puzzle is unsolvable'
        : 'No solution found within the search budget; solvability is unknown'

      throw new Error(reason)
    }

    const certified = { ...level, solution: result.moves }

    if (option === '--story') {
      if (!storyIndex(level.id)) throw new Error('Add the chapter to STORY_ITINERARY before importing it')
      if (level.planning) throw new Error('Story chapters do not have hard variants')
      stories[level.id] = certified
      await writeFile(storyPath, JSON.stringify(stories) + '\n')
      console.log(`Saved ${level.id} to story content`)
    } else {
      const output = resolve(option ?? input.replace(/\.tmj$/, '') + '.level.json')
      await writeFile(output, JSON.stringify(certified, null, 2) + '\n')
      console.log(output)
    }
  } else throw new Error('Usage: node scripts/level-editor.js export CODE [output.tmj] | import input.tmj [output.json | --story]')
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
