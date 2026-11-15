import { certifyMoveGap, MINIMUM_EXTRA_MOVES } from './difficulty.js'
import { stageGateFlag } from './reverse-park.js'
import { createWalkingSearch } from './walking-search.js'
import { rasterize, MAP_VERSION } from '../geo/rasterize.js'
import { regionById } from '../content/regions.js'
import { DIRECTIONS, OPPOSITE, neighbor, reachable, walkable, replay, isSolved, validateLevel, initialState } from './engine.js'
import { randomFrom, normalizeCode } from './seed.js'
import { addGoalGatePattern, challengeDistances, pushLowerBound } from './challenge.js'
import { solve } from './solver.js'
import { goalDependencies, analyzeDesign, meetsDesign } from './design-quality.js'

export const GENERATOR_VERSION = 4
const THRESHOLDS = [0.36, 0.24, 0.48, 0.12]

export class GenerationExhausted extends Error {
  constructor (code, region, planning) {
    super('No certified puzzle within the generation budget')
    this.name = 'GenerationExhausted'
    this.code = code
    this.region = region
    this.planning = planning
  }
}

const distance = (map, a, b) => Math.abs(a % map.width - b % map.width) + Math.abs(Math.floor(a / map.width) - Math.floor(b / map.width))

function candidateGoals (map, country, floor) {
  const degree = position => DIRECTIONS.filter(direction => floor.has(neighbor(map, position, direction))).length
  if (!map.sea) return map.cells.filter(cell => cell.country === country && floor.has(cell.position) && degree(cell.position) >= 3)
    .map(cell => ({ country, position: cell.position, anchor: null }))
  const outline = map.regions.find(region => region.id === country)?.polygons.flatMap(polygon => polygon[0]) ?? []
  return map.floors.filter(position => degree(position) === 4).map(position => {
    const x = position % map.width + 0.5
    const y = Math.floor(position / map.width) + 0.5
    let nearest = Infinity
    let anchor = null
    for (const point of outline) {
      const d = Math.hypot(x - point[0], y - point[1])
      if (d < nearest) {
        nearest = d
        anchor = point
      }
    }
    return { country, position, anchor, nearest }
  }).filter(goal => goal.nearest <= 2.8).sort((a, b) => a.nearest - b.nearest).slice(0, 16)
}

function createBase (definition, countries, rng, threshold, motif) {
  const map = rasterize(definition.id, threshold)
  const floor = new Set(map.floors)
  const goals = []
  for (const country of countries) {
    const options = candidateGoals(map, country, floor).filter(candidate => goals.every(goal => distance(map, goal.position, candidate.position) >= 3))
    if (!options.length) return null
    goals.push(options[Math.floor(rng() * Math.min(options.length, map.sea ? 6 : options.length))])
  }
  // These are puzzle obstacles, not claims about the location of real mountain ranges.
  const eligible = map.floors.filter(position => goals.every(goal => distance(map, position, goal.position) > 2) && DIRECTIONS.every(direction => floor.has(neighbor(map, position, direction))))
  const center = eligible[Math.floor(rng() * eligible.length)]
  const pattern = motif === 'detour' ? [center, neighbor(map, center, 'right')]
    : motif === 'gate' ? [neighbor(map, center, 'left'), neighbor(map, center, 'right')]
      : [center]
  const obstacles = [...new Set(pattern.filter(position => eligible.includes(position)))]
  return {
    width: map.width, height: map.height, floors: map.floors, obstacles, goals,
    region: definition.id, mapVersion: MAP_VERSION, threshold, sea: map.sea, motif
  }
}

/** Each reverse pull records the exact forward moves that undo it. */
function scramble (base, rng, pulls, planning = false) {
  const floor = walkable(base)
  const walkSearch = createWalkingSearch(base, floor)
  const goalPositions = new Set(base.goals.map(goal => goal.position))
  const lowerBounds = challengeDistances(base)
  let state = {
    player: [...reachable(base, { player: base.goals[0].position, boxes: [] }, floor).keys()].find(position => !goalPositions.has(position)),
    boxes: base.goals.map(goal => ({ id: goal.country, country: goal.country, position: goal.position })),
    moves: 0,
    pushes: 0
  }
  let solution = []
  const seen = new Set()
  let best = null
  const moved = new Set()
  for (let step = 0; step < pulls + (planning ? 180 : 100); step++) {
    const paths = walkSearch(state)
    const occupied = new Set(state.boxes.map(box => box.position))
    const options = []
    state.boxes.forEach((box, index) => {
      for (const direction of DIRECTIONS) {
        const stand = neighbor(base, box.position, direction)
        const back = neighbor(base, stand, direction)
        if (!paths.has(stand) || !floor.has(back) || occupied.has(back)) continue
        const positions = state.boxes.map((other, i) => i === index ? stand : other.position)
        const key = positions.join(',')
        if (seen.has(key)) continue
        const goal = base.goals[index].position
        const distance = Math.abs(stand % base.width - goal % base.width) + Math.abs(Math.floor(stand / base.width) - Math.floor(goal / base.width))
        if (distance > (planning ? 14 : 10)) continue
        options.push({ index, direction, stand, back, key, priority: moved.has(index) ? 1 : 4 })
      }
    })
    if (!options.length) break
    const total = options.reduce((sum, option) => sum + option.priority, 0)
    let choice = rng() * total
    const option = options.find(option => (choice -= option.priority) < 0) ?? options.at(-1)
    seen.add(option.key)
    moved.add(option.index)
    solution = [OPPOSITE[option.direction], ...paths.pathTo(option.stand).toReversed().map(direction => OPPOSITE[direction]), ...solution]
    state = {
      ...state,
      player: option.back,
      boxes: state.boxes.map((box, index) => index === option.index ? { ...box, position: option.stand } : box)
    }
    const uncovered = !goalPositions.has(state.player) && state.boxes.every(box => !goalPositions.has(box.position))
    if (uncovered && moved.size === state.boxes.length && step >= pulls - 1 && pushLowerBound(lowerBounds, state) >= (planning ? 16 : 10) && pushLowerBound(lowerBounds, state) <= (planning ? 55 : 24) && goalDependencies(base, state).length >= 1) {
      const staged = planning ? stageGateFlag(base, state, solution) : { ...state, solution }
      if (staged && !goalPositions.has(staged.player) && staged.boxes.every(box => !goalPositions.has(box.position)) && goalDependencies(base, staged).length) {
        best = { player: staged.player, boxes: staged.boxes, solution: staged.solution }
        break
      }
    }
  }
  return best
}

export function generate (inputCode, { onProgress = () => {}, attemptLimit, minimumExtraMoves = MINIMUM_EXTRA_MOVES, solverBudget } = {}) {
  const code = normalizeCode(inputCode)
  if (!code) throw new Error('Invalid puzzle code')
  const [, regionId, suffix] = code.split('-')
  const story = /^S([1-3])$/.exec(suffix)
  const stop = Number(story?.[1] ?? 0)
  const rng = randomFrom(`${code}|${MAP_VERSION}|${GENERATOR_VERSION}`)
  const definition = regionById(regionId === 'NA' && (stop === 3 || (!stop && rng() < 0.35)) ? 'CAR' : regionId)
  const planning = code.endsWith('-P')
  const count = planning ? 3 : story ? (regionId === 'SA' ? stop : stop === 1 ? 2 : 3) : 3
  const motif = planning ? (rng() < 0.5 ? 'trapdoor' : 'sliding-door') : ['open', 'detour', 'gate'][stop ? stop - 1 : Math.floor(rng() * 3)]
  const limit = attemptLimit ?? (planning ? 64 : 48)
  const workLimit = solverBudget ?? (planning ? 180000 : 100000)
  let work = 0
  onProgress({ stage: 'map', attempt: 0, limit })
  for (let attempt = 0; attempt < limit && work < workLimit; attempt++) {
    if (attempt % 4 === 0) onProgress({ stage: 'search', attempt, limit })
    const countries = story ? definition.story.slice(0, count) : [...definition.pool].map(country => ({ country, order: rng() })).sort((a, b) => a.order - b.order).slice(0, count).map(item => item.country)
    let base = createBase(definition, countries, rng, THRESHOLDS[Math.min(3, Math.floor(attempt * 4 / limit))], motif)
    if (base) base = addGoalGatePattern(base, rng, planning)
    if (!base) continue
    const result = scramble(base, rng, planning ? 35 : 18, planning)
    if (!result) continue
    const level = { ...base, ...result, planning, id: code, generatorVersion: GENERATOR_VERSION }
    if (validateLevel(level).length) continue
    const certificate = replay(level, level.solution)
    if (!certificate.valid || !isSolved(level, certificate.state)) continue
    const checked = solve(level, initialState(level), 10000)
    work += checked.expanded
    if (checked.status !== 'solved') continue
    const checkedReplay = replay(level, checked.moves)
    if (!checkedReplay.valid || !isSolved(level, checkedReplay.state)) continue
    const quality = analyzeDesign(level, checked.moves)
    if (!meetsDesign(quality, planning)) continue
    const gap = certifyMoveGap(level, { minimum: minimumExtraMoves, maxStates: Math.min(planning ? 50000 : 35000, Math.floor(Math.max(0, workLimit - work) / 2)) })
    work += gap.expanded
    if (gap.status !== 'accepted') continue
    onProgress({ stage: 'ready', attempt: attempt + 1, limit })
    return { ...level, solution: gap.certificate.solution, designSolution: checked.moves, quality, moveCertificate: gap.certificate }
  }
  throw new GenerationExhausted(code, definition.id, planning)
}
