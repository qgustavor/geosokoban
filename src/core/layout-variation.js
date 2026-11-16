import { initialState, move, walkable, DIRECTIONS, neighbor } from './engine.js'
import { analyzeDesign, meetsDesign } from './design-quality.js'
import { randomFrom } from './seed.js'
import { layoutStamps, layoutConnected } from './layout-patterns.js'
import { GENERATOR_VERSION } from './generation-version.js'

/** Cells used by a certificate include player support squares, not only box paths. */
export function solutionFootprint (level, directions) {
  const floor = walkable(level)
  let state = initialState(level)
  const protectedCells = new Set([state.player, ...state.boxes.map(box => box.position)])

  for (const direction of directions) {
    const next = move(level, state, direction, floor)
    if (next === state) throw new Error('Cannot vary an invalid solution')

    state = next

    // A wall on a walking/support tile can invalidate a push even when it
    // never intersects the flag's own path. Preserve both kinds of occupancy.
    protectedCells.add(state.player)
    for (const box of state.boxes) protectedCells.add(box.position)
  }

  return protectedCells
}

/**
 * Add seeded structures without touching either optimal solution's footprint.
 * Adding walls cannot improve an optimum; retaining the optimal path cannot
 * worsen it. Both move/push optima remain exact, and the wall-free baseline is
 * unchanged. Recheck design metrics because relaxed per-box distances can change.
 */
export function varyCertifiedLayout (source, code) {
  const rng = randomFrom(`${code}|layout-variation|${GENERATOR_VERSION}`)
  const moveFootprint = solutionFootprint(source, source.solution)
  const pushFootprint = solutionFootprint(source, source.designSolution)
  const goalApproaches = source.goals.flatMap(goal =>
    DIRECTIONS.map(direction => neighbor(source, goal.position, direction))
  )
  const protectedCells = new Set([...moveFootprint, ...pushFootprint, ...goalApproaches])

  // Variants must not modify the frozen source used by other puzzle codes.
  let level = structuredClone(source)
  const clusters = []

  for (const cells of layoutStamps(level, rng, source.motif)) {
    const blocked = new Set(level.obstacles)
    if (cells.some(cell => protectedCells.has(cell) || blocked.has(cell))) continue

    const obstacles = new Set([...blocked, ...cells])
    if (!layoutConnected(level, obstacles)) continue

    const candidate = { ...level, obstacles: [...obstacles].sort((a, b) => a - b) }
    const quality = analyzeDesign(candidate, candidate.designSolution)
    if (!meetsDesign(quality, candidate.planning)) continue

    // Commit each accepted cluster before testing the next, so connectivity
    // and quality checks include every structure already added to this variant.
    level = { ...candidate, quality }
    clusters.push(cells)
    if (clusters.length >= 2) break
  }

  return { ...level, layout: { ...level.layout, variantClusters: clusters } }
}
