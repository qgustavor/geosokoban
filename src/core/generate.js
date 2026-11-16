import { certifyMoveGap, MINIMUM_EXTRA_MOVES } from './difficulty.js'
import { stageGateFlag } from './reverse-park.js'
import { createWalkingSearch } from './walking-search.js'
import { rasterize, MAP_VERSION } from '../geo/rasterize.js'
import { regionById } from '../content/regions.js'
import { DIRECTIONS, OPPOSITE, neighbor, reachable, walkable, replay, isSolved, validateLevel, initialState } from './engine.js'
import { randomFrom, parseCode } from './seed.js'
import { challengeDistances, pushLowerBound } from './challenge.js'
import { addPuzzleLayout, LAYOUT_FAMILIES } from './layout-patterns.js'
import { solve } from './solver.js'
import { goalDependencies, analyzeDesign, meetsDesign } from './design-quality.js'

import { GENERATOR_VERSION } from './generation-version.js'
export { GENERATOR_VERSION } from './generation-version.js'

const THRESHOLDS = [0.36, 0.24, 0.48, 0.12]
const goalCandidates = new WeakMap()

export class GenerationExhausted extends Error {
  constructor (code, region, planning) {
    super('No certified puzzle within the generation budget')
    this.name = 'GenerationExhausted'
    this.code = code
    this.region = region
    this.planning = planning
  }
}

const distance = (map, a, b) => {
  const horizontal = Math.abs(a % map.width - b % map.width)
  const vertical = Math.abs(Math.floor(a / map.width) - Math.floor(b / map.width))
  return horizontal + vertical
}

function candidateGoals (map, country, floor) {
  let candidates = goalCandidates.get(map)

  if (!candidates) {
    candidates = new Map()
    goalCandidates.set(map, candidates)
  }

  // The map object identifies its raster geometry. Retry attempts can reuse
  // these candidates without consuming randomness or repeating outline searches.
  if (!candidates.has(country)) candidates.set(country, findCandidateGoals(map, country, floor))

  return candidates.get(country)
}

function findCandidateGoals (map, country, floor) {
  const degree = position => DIRECTIONS.filter(direction => floor.has(neighbor(map, position, direction))).length

  if (!map.sea) {
    // Land destinations stay inside their country and need multiple approaches.
    const cells = map.cells.filter(cell =>
      cell.country === country && floor.has(cell.position) && degree(cell.position) >= 3
    )
    return cells.map(cell => ({ country, position: cell.position, anchor: null }))
  }

  // On sea boards, use an open water cell near the country's outline and retain
  // its nearest outline point as the visual anchor. Distances use tile centers.
  const outline = map.regions.find(region => region.id === country)?.polygons.flatMap(polygon => polygon[0]) ?? []
  const openPositions = map.floors.filter(position => degree(position) === 4)
  const candidates = openPositions.map(position => {
    const x = position % map.width + 0.5
    const y = Math.floor(position / map.width) + 0.5
    let nearest = Infinity
    let anchor = null

    for (const point of outline) {
      const distanceToOutline = Math.hypot(x - point[0], y - point[1])

      if (distanceToOutline < nearest) {
        nearest = distanceToOutline
        anchor = point
      }
    }

    return { country, position, anchor, nearest }
  })

  return candidates.filter(goal => goal.nearest <= 2.8).sort((a, b) => a.nearest - b.nearest).slice(0, 16)
}

function createBase (definition, countries, rng, threshold, motif) {
  const map = rasterize(definition.id, threshold)
  const floor = new Set(map.floors)
  const goals = []

  for (const country of countries) {
    const options = candidateGoals(map, country, floor).filter(candidate =>
      goals.every(goal => distance(map, goal.position, candidate.position) >= 3)
    )
    if (!options.length) return null

    // Sea candidates are distance-sorted; choose among the closest six that
    // still satisfy spacing, rather than placing a destination far from its anchor.
    const optionCount = Math.min(options.length, map.sea ? 6 : options.length)
    const selected = Math.floor(rng() * optionCount)
    goals.push(options[selected])
  }

  // These are puzzle obstacles, not claims about the location of real mountain ranges.
  const eligible = map.floors.filter(position => {
    const clearOfGoals = goals.every(goal => distance(map, position, goal.position) > 2)
    if (!clearOfGoals) return false

    return DIRECTIONS.every(direction => floor.has(neighbor(map, position, direction)))
  })
  const center = eligible[Math.floor(rng() * eligible.length)]
  let pattern

  if (motif === 'detour') {
    pattern = [center, neighbor(map, center, 'right')]
  } else if (motif === 'gate') {
    pattern = [neighbor(map, center, 'left'), neighbor(map, center, 'right')]
  } else {
    pattern = [center]
  }

  const obstacles = [...new Set(pattern.filter(position => eligible.includes(position)))]

  return {
    width: map.width,
    height: map.height,
    floors: map.floors,
    obstacles,
    goals,
    region: definition.id,
    mapVersion: MAP_VERSION,
    threshold,
    sea: map.sea,
    motif
  }
}

/** Each reverse pull records the exact forward moves that undo it. */
function scramble (base, rng, pulls, planning = false) {
  const floor = walkable(base)
  const walkSearch = createWalkingSearch(base, floor, { reuseBuffers: true })
  const goalPositions = new Set(base.goals.map(goal => goal.position))
  const lowerBounds = challengeDistances(base)

  // Start with every flag delivered. Pick the first non-goal tile in the
  // goal's wall-connected area before placing the flags for reverse play.
  const emptyState = { player: base.goals[0].position, boxes: [] }
  const reachablePositions = [...reachable(base, emptyState, floor).keys()]
  const player = reachablePositions.find(position => !goalPositions.has(position))
  let state = {
    player,
    boxes: base.goals.map(goal => ({ id: goal.country, country: goal.country, position: goal.position })),
    moves: 0,
    pushes: 0
  }
  let solution = []
  const seen = new Set()
  let best = null
  const moved = new Set()
  const stepLimit = pulls + (planning ? 180 : 100)

  for (let step = 0; step < stepLimit; step++) {
    const paths = walkSearch(state)
    const occupied = new Set(state.boxes.map(box => box.position))
    const options = []

    state.boxes.forEach((box, index) => {
      for (const direction of DIRECTIONS) {
        // A reverse pull needs a reachable tile beside the flag and an empty
        // tile behind that, where the player can retreat while pulling.
        const stand = neighbor(base, box.position, direction)
        const back = neighbor(base, stand, direction)
        if (!paths.has(stand) || !floor.has(back) || occupied.has(back)) continue

        const positions = state.boxes.map((other, i) => i === index ? stand : other.position)
        const key = positions.join(',')
        if (seen.has(key)) continue

        const goal = base.goals[index].position
        const distanceFromGoal = distance(base, stand, goal)
        if (distanceFromGoal > (planning ? 14 : 10)) continue

        // Prefer flags not yet moved so the scramble involves the whole puzzle.
        options.push({ index, direction, stand, back, key, priority: moved.has(index) ? 1 : 4 })
      }
    })

    if (!options.length) break

    const total = options.reduce((sum, option) => sum + option.priority, 0)
    let choice = rng() * total
    const option = options.find(option => {
      choice -= option.priority
      return choice < 0
    }) ?? options.at(-1)

    seen.add(option.key)
    moved.add(option.index)

    // Undo the newest pull first, then retrace its approach walk before the
    // previously recorded solution. This keeps every candidate replayable.
    const undoPull = OPPOSITE[option.direction]
    const returnWalk = paths.pathTo(option.stand).toReversed().map(direction => OPPOSITE[direction])
    solution = [undoPull, ...returnWalk, ...solution]
    state = {
      ...state,
      player: option.back,
      boxes: state.boxes.map((box, index) => index === option.index ? { ...box, position: option.stand } : box)
    }

    const uncovered = !goalPositions.has(state.player) && state.boxes.every(box => !goalPositions.has(box.position))
    const enoughPulls = step >= pulls - 1
    if (!uncovered || moved.size !== state.boxes.length || !enoughPulls) continue

    // Reject trivial or overly long independent deliveries before paying for
    // staging and optimal searches. A dependency adds a delivery-order decision.
    const lowerBound = pushLowerBound(lowerBounds, state)
    const minimumPushes = planning ? 16 : 10
    const maximumPushes = planning ? 55 : 24
    const withinPushRange = lowerBound >= minimumPushes && lowerBound <= maximumPushes
    if (!withinPushRange || goalDependencies(base, state).length < 1) continue

    const staged = planning ? stageGateFlag(base, state, solution) : { ...state, solution }
    if (!staged) continue

    const stagedGoalsUncovered = !goalPositions.has(staged.player) &&
      staged.boxes.every(box => !goalPositions.has(box.position))
    if (!stagedGoalsUncovered || !goalDependencies(base, staged).length) continue

    best = { player: staged.player, boxes: staged.boxes, solution: staged.solution }
    break
  }

  return best
}

export function generate (inputCode, {
  onProgress = () => {},
  attemptLimit,
  minimumExtraMoves = MINIMUM_EXTRA_MOVES,
  solverBudget
} = {}) {
  const parsed = parseCode(inputCode)
  if (!parsed) throw new Error('Invalid puzzle code')

  const { code, region: regionId, planning, tour: stop } = parsed
  const story = stop > 0
  const rng = randomFrom(`${code}|${MAP_VERSION}|${GENERATOR_VERSION}`)

  // Keep this draw conditional: story stops and non-NA regions must not consume
  // the random value reserved for choosing the Caribbean map on generated NA codes.
  const useCaribbean = regionId === 'NA' && (stop === 3 || (!stop && rng() < 0.35))
  const definition = regionById(useCaribbean ? 'CAR' : regionId)
  let count = 3

  if (!planning && story) {
    count = regionId === 'SA' ? stop : stop === 1 ? 2 : 3
  }

  const motif = LAYOUT_FAMILIES[Math.floor(rng() * LAYOUT_FAMILIES.length)]

  // Deterministic work budgets: device speed never changes a shared code.
  const limit = attemptLimit ?? (planning ? 24 : 18)
  const workLimit = solverBudget ?? (planning ? 28000 : 18000)
  const validBudgets = [limit, workLimit].every(value => Number.isSafeInteger(value) && value >= 0)
  if (!validBudgets) throw new RangeError('Invalid generation budget')

  let work = 0
  onProgress({ stage: 'map', attempt: 0, limit })

  for (let attempt = 0; attempt < limit && work < workLimit; attempt++) {
    if (attempt % 4 === 0) onProgress({ stage: 'search', attempt, limit })

    let countries

    if (story) {
      countries = definition.story.slice(0, count)
    } else {
      // Assign random priorities to the entire pool before selecting countries;
      // drawing only for selected entries would change every subsequent choice.
      const ordered = [...definition.pool].map(country => ({ country, order: rng() })).sort((a, b) => a.order - b.order)
      countries = ordered.slice(0, count).map(item => item.country)
    }

    // Divide retries into four threshold bands without changing their order.
    const thresholdIndex = Math.min(3, Math.floor(attempt * 4 / limit))
    let base = createBase(definition, countries, rng, THRESHOLDS[thresholdIndex], motif)
    if (base) base = addPuzzleLayout(base, rng, planning, motif)
    if (!base) continue

    const result = scramble(base, rng, planning ? 35 : 18, planning)
    if (!result) continue

    const level = { ...base, ...result, planning, id: code, generatorVersion: GENERATOR_VERSION }
    if (validateLevel(level).length) continue

    const certificate = replay(level, level.solution)
    if (!certificate.valid || !isSolved(level, certificate.state)) continue

    // First verify a push-optimal design solution within the shared work budget.
    const pushSearchBudget = Math.min(4000, Math.max(0, workLimit - work))
    const checked = solve(level, initialState(level), pushSearchBudget)
    work += checked.expanded
    if (checked.status !== 'solved') continue

    const checkedReplay = replay(level, checked.moves)
    if (!checkedReplay.valid || !isSolved(level, checkedReplay.state)) continue

    const quality = analyzeDesign(level, checked.moves)
    if (!meetsDesign(quality, planning)) continue

    // Certification runs two move-optimal searches. Give each at most half the
    // remaining work so their combined expansions stay within the total budget.
    const remainingWork = Math.max(0, workLimit - work)
    const certificateBudget = Math.min(planning ? 10000 : 7000, Math.floor(remainingWork / 2))
    const gap = certifyMoveGap(level, { minimum: minimumExtraMoves, maxStates: certificateBudget })
    work += gap.expanded
    if (gap.status !== 'accepted') continue

    onProgress({ stage: 'ready', attempt: attempt + 1, limit })

    return {
      ...level,
      solution: gap.certificate.solution,
      designSolution: checked.moves,
      quality,
      moveCertificate: gap.certificate
    }
  }

  throw new GenerationExhausted(code, definition.id, planning)
}
