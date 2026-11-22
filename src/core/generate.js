import { stageGateFlag, planGateCrossing } from './reverse-park.js'
import { createWalkingSearch } from './walking-search.js'
import { rasterize, MAP_VERSION } from '../geo/rasterize.js'
import { regionById } from '../content/regions.js'
import {
  DIRECTIONS, OPPOSITE, neighbor, reachable, walkable, replay, isSolved, validateLevel, initialState
} from './engine.js'
import { randomFrom, parseCode } from './seed.js'
import { challengeDistances } from './challenge.js'
import { chooseGoals, startGuides, footprint } from './placement.js'
import { addPuzzleLayout, trimUnusedClusters, LAYOUT_FAMILIES } from './layout-patterns.js'
import { solve } from './solver.js'
import { solveDeliveries, solveWithParking } from './delivery-plan.js'
import { hardCandidates } from './hard-variant.js'
import { chooseDesign, goalDependencies, analyzeDesign, meetsDesign } from './design-quality.js'

import countryData from '../data/countries.json' with { type: 'json' }

const THRESHOLDS = [0.36, 0.24, 0.48, 0.12]
const goalCandidates = new WeakMap()

class GenerationExhausted extends Error {
  constructor (code, region, planning) {
    super('No verified puzzle within the generation budget')
    this.name = 'GenerationExhausted'
    this.code = code
    this.region = region
    this.planning = planning
  }
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

function createBase (definition, pools, rng, threshold, motif) {
  const map = rasterize(definition.id, threshold)
  const goals = chooseGoals(map, pools, rng)
  if (!goals) return null

  return {
    width: map.width,
    height: map.height,
    floors: map.floors,
    obstacles: [],
    goals,
    region: definition.id,
    mapVersion: MAP_VERSION,
    threshold,
    sea: map.sea,
    motif
  }
}

/** Each reverse pull records the exact forward moves that undo it. */
function scramble (base, rng, design) {
  const floor = walkable(base)
  const walkSearch = createWalkingSearch(base, floor, { reuseBuffers: true })
  const goalPositions = new Set(base.goals.map(goal => goal.position))
  const lowerBounds = challengeDistances(base)
  const targets = design.ranges.map(([minimum, maximum]) => minimum + Math.floor(rng() * (maximum - minimum + 1)))
  const needsOrder = ['delivery-order', 'parking'].includes(design.style)
  const crossing = needsOrder ? planGateCrossing(base, lowerBounds, rng) : null
  if (needsOrder && !crossing) return null
  if (crossing) targets[crossing.index] = crossing.pushes
  const guides = startGuides(base, lowerBounds, targets, crossing, floor, rng)

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
  const stepLimit = 100

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

        const distances = lowerBounds.get(box.country)
        const before = distances.get(box.position)
        const after = distances.get(stand)
        const target = targets[index]
        if (after === undefined || after > target + 2) continue

        // Pull toward a chosen terrain-aware distance, rather than taking a
        // random walk that usually leaves every flag beside its destination.
        let improvement = Math.abs(before - target) - Math.abs(after - target)
        const guide = guides[index]
        if (guide) {
          const nextDistance = guide.get(stand)
          if (nextDistance === undefined) continue
          improvement = guide.get(box.position) - nextDistance
        }

        const priority = (improvement > 0 ? 6 : 1) * (moved.has(index) ? 1 : 3)
        options.push({ index, direction, stand, back, key, priority })
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
    if (!uncovered || moved.size !== state.boxes.length) continue

    const distances = state.boxes.map(box => lowerBounds.get(box.country).get(box.position))
    const closeToTargets = distances.every((value, index) => value >= targets[index] - 1)
    const totalDistance = distances.reduce((sum, value) => sum + value, 0)
    if (!closeToTargets || totalDistance > design.maximumPushes) continue

    if (needsOrder && !goalDependencies(base, state).length) continue

    const staged = design.style === 'parking' ? stageGateFlag(base, state, solution) : { ...state, solution }
    if (!staged) continue
    if (goalPositions.has(staged.player) || staged.boxes.some(box => goalPositions.has(box.position))) continue
    if (needsOrder && !goalDependencies(base, staged).length) continue

    const spread = footprint(base, staged.boxes)
    if (spread.x < 0.55 || spread.y < 0.55) continue

    best = { player: staged.player, boxes: staged.boxes, solution: staged.solution }
    break
  }

  return best
}

/** Certify the intended plan; failed limited searches are not deadlock proofs. */
function verifyCandidate (level, design, planning, budget) {
  let work = 0
  const dependencies = goalDependencies(level)
  if (design.style === 'journey' && dependencies.length) return { work }
  if (['delivery-order', 'parking'].includes(design.style) && !dependencies.length) return { work }

  let checked = solveDeliveries(level, Math.min(4000, budget))
  work += checked.expanded
  if (design.style === 'parking' && checked.status === 'solved') return { work }

  if (checked.status !== 'solved' && design.style !== 'journey') {
    const remaining = Math.min(planning ? 8000 : 6000, budget - work)
    checked = design.style === 'parking'
      ? solveWithParking(level, remaining, planning ? 3 : 2)
      : solve(level, initialState(level), remaining)
    work += checked.expanded
  }

  if (checked.status !== 'solved') return { work }
  const result = replay(level, checked.moves)
  if (!result.valid || !isSolved(level, result.state)) return { work }
  const quality = analyzeDesign(level, checked.moves)
  if (!meetsDesign(quality, planning, design)) return { work }

  return { work, level: { ...level, solution: checked.moves }, quality }
}

export function generate (inputCode, {
  onProgress = () => {},
  attemptLimit,
  solverBudget
} = {}) {
  const parsed = parseCode(inputCode)
  if (!parsed) throw new Error('Invalid puzzle code')

  if (parsed.story) throw new Error('Story chapters must use authored boards')

  const { code, date, region: regionId, planning } = parsed
  const rng = randomFrom(date)
  const definition = regionById(regionId)

  const design = chooseDesign(rng)
  const motif = LAYOUT_FAMILIES[Math.floor(rng() * LAYOUT_FAMILIES.length)]

  // Bound candidates and search expansions, not wall-clock time. A slow device must
  // explore the same sequence, and exhaustion is an error rather than a substitute board.
  const limit = attemptLimit ?? 160
  const workLimit = solverBudget ?? 200000
  const validBudgets = [limit, workLimit].every(value => Number.isSafeInteger(value) && value >= 0)
  if (!validBudgets) throw new RangeError('Invalid generation budget')

  let work = 0
  onProgress({ stage: 'map', attempt: 0, limit })

  for (let attempt = 0; attempt < limit && work < workLimit; attempt++) {
    if (attempt % 4 === 0) onProgress({ stage: 'search', attempt, limit })

    const thresholdIndex = Math.floor(attempt / 8) % THRESHOLDS.length
    const threshold = THRESHOLDS[thresholdIndex]
    const map = rasterize(definition.id, threshold)
    const floor = new Set(map.floors)
    // A country needs a usable goal inside it, or a nearby water dock on sea boards.
    // Small or disconnected land shapes are excluded by geometry, not by their flags.
    const pools = map.regions.filter(region => countryData[region.id]).map(region => {
      const candidates = candidateGoals(map, region.id, floor)
      return map.sea ? candidates.slice(0, 6) : candidates
    }).filter(candidates => candidates.length)

    let base = createBase(definition, pools, rng, threshold, motif)
    if (base) base = addPuzzleLayout(base, rng, motif, design.style)
    if (!base) continue

    const result = scramble(base, rng, design)
    if (!result) continue

    const level = { ...base, ...result, planning: false, id: date }
    if (validateLevel(level).length) continue

    const certificate = replay(level, level.solution)
    if (!certificate.valid || !isSolved(level, certificate.state)) continue

    let verified = verifyCandidate(level, design, false, workLimit - work)
    work += verified.work
    if (!verified.level) continue

    // Keep only stamps near a delivery. Re-solve after removal: opening space
    // can change the intended ordering or make parking unnecessary.
    for (let pass = 0; pass < level.layout.clusters.length; pass++) {
      const trimmed = trimUnusedClusters(verified.level, verified.level.solution)
      if (trimmed === verified.level) break
      verified = verifyCandidate(trimmed, design, false, workLimit - work)
      work += verified.work
      if (!verified.level) break
    }
    if (!verified.level) continue

    // Build both variants from this candidate, even when requesting standard,
    // so request order and device speed cannot change the pairing.
    let hard = null
    const hardDesign = { ...design, maximumPushes: 38 }
    const candidates = hardCandidates(verified.level, randomFrom(`${date}:hard:${attempt}`), verified.quality)
    for (const candidate of candidates) {
      if (work >= workLimit) break
      const checked = verifyCandidate(candidate, hardDesign, true, workLimit - work)
      work += checked.work
      if (!checked.level) continue
      if (checked.quality.pushes > verified.quality.pushes + 6) continue
      if (checked.quality.revisits > verified.quality.revisits) continue
      const spread = footprint(checked.level, checked.level.boxes)
      if (spread.x < 0.55 || spread.y < 0.55) continue
      hard = checked.level
      break
    }
    if (!hard) continue

    onProgress({ stage: 'ready', attempt: attempt + 1, limit })
    return planning ? hard : verified.level
  }

  throw new GenerationExhausted(code, definition.id, planning)
}
