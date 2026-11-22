import { challengeDistances } from './challenge.js'
import { minimumRouteTurns } from './route-complexity.js'
import { routingTerrain } from './terrain.js'

/** Several terrain additions, not one stamped obstacle or a more distant flag. */
export function * hardCandidates (level, rng, quality) {
  const before = challengeDistances(level)
  let offered = 0
  for (const candidate of routingTerrain(level, rng, { hard: true, limit: 160 })) {
    const bounds = challengeDistances(candidate)
    const increases = level.boxes.map(box => {
      return (bounds.get(box.country).get(box.position) ?? Infinity) - before.get(box.country).get(box.position)
    })
    if (increases.reduce((sum, value) => sum + value, 0) > 8) continue

    // Compare a lower bound over ALL routes with a concrete standard solution.
    // Merely taking a longer or unnecessarily winding solver route cannot pass.
    const addsDecision = level.boxes.some(box => {
      const turns = minimumRouteTurns(candidate, box)
      const standardTurns = quality.perFlagTurns[box.country]
      return turns > standardTurns && turns <= standardTurns + 3
    })
    if (!addsDecision) continue

    yield { ...candidate, id: `${level.id}-hard`, planning: true }
    if (++offered >= 48) return
  }
}
