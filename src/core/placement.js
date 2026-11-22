import { DIRECTIONS, OPPOSITE, neighbor } from './engine.js'

export function gridDistance (level, a, b) {
  return Math.abs(a % level.width - b % level.width) +
    Math.abs(Math.floor(a / level.width) - Math.floor(b / level.width))
}

function extent (level, positions) {
  const xs = positions.map(position => position % level.width)
  const ys = positions.map(position => Math.floor(position / level.width))

  return { x: Math.max(...xs) - Math.min(...xs) + 1, y: Math.max(...ys) - Math.min(...ys) + 1 }
}

/** Spread actors and destinations, not a quota of tiles the player must visit. */
export function footprint (level, boxes) {
  const area = extent(level, level.floors)
  const used = extent(level, [...level.goals.map(goal => goal.position), ...boxes.map(box => box.position)])

  return { x: used.x / area.x, y: used.y / area.y }
}

/** Every country can be the first choice; subsequent choices favor geographical spread. */
export function chooseGoals (map, pools, rng) {
  if (pools.length < 3) return null
  const first = pools[Math.floor(rng() * pools.length)]
  const goals = [first[Math.floor(rng() * first.length)]]

  while (goals.length < 3) {
    const options = pools.filter(pool => !goals.some(goal => goal.country === pool[0].country)).map(pool => {
      const candidates = pool.map(goal => {
        const separation = Math.min(...goals.map(other => gridDistance(map, other.position, goal.position)))
        return { goal, separation, score: separation + rng() * 4 }
      }).filter(item => item.separation >= 3).sort((a, b) => b.score - a.score)

      return candidates[0]
    }).filter(Boolean).sort((a, b) => b.score - a.score)
    if (!options.length) return null

    // A short seeded shortlist favors separation without always picking the
    // three most distant countries or excluding a small starting country.
    goals.push(options[Math.floor(rng() * Math.min(4, options.length))].goal)
  }

  return goals.map(({ country, position, anchor }) => ({ country, position, anchor }))
}

/** Distance to a preferred start over legal reverse pulls, ignoring other flags. */
export function pullDistances (level, target, floor) {
  const distances = new Map([[target, 0]])
  const queue = [target]

  for (let cursor = 0; cursor < queue.length; cursor++) {
    const current = queue[cursor]
    for (const direction of DIRECTIONS) {
      const previous = neighbor(level, current, direction)
      const support = neighbor(level, current, OPPOSITE[direction])
      if (!floor.has(previous) || !floor.has(support) || distances.has(previous)) continue
      distances.set(previous, distances.get(current) + 1)
      queue.push(previous)
    }
  }

  return distances
}

/** Give reverse play a direction that uses working space beyond the destinations. */
export function startGuides (base, distances, targets, crossing, floor, rng) {
  const positions = base.goals.map(goal => goal.position)
  const goals = new Set(positions)
  const area = extent(base, base.floors)

  return base.goals.map((goal, index) => {
    if (crossing?.index === index) {
      positions.push(crossing.position)
      return crossing.toward
    }

    const candidates = [...distances.get(goal.country)].filter(([position, pushes]) => {
      return !goals.has(position) && pushes >= targets[index] - 1 && pushes <= targets[index] + 1
    }).map(([position]) => {
      const used = extent(base, [...positions, position])
      const separation = Math.min(...positions.map(other => gridDistance(base, position, other)))
      const score = 10 * (used.x / area.x + used.y / area.y) + Math.min(separation, 8) + rng() * 3
      return { position, score }
    }).sort((a, b) => b.score - a.score)

    if (!candidates.length) return null
    const { position } = candidates[Math.floor(rng() * Math.min(3, candidates.length))]
    positions.push(position)
    return pullDistances(base, position, floor)
  })
}
