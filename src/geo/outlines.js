import outlines from '../content/map-outlines.json' with { type: 'json' }

/** Rendering uses projected paths, never the world loader or generator. */
export function outlinesForLevel (level) {
  const map = outlines.regions[level.region]
  if (!map || level.mapVersion !== outlines.mapVersion || level.width !== map.width || level.height !== map.height) return []
  return map.regions
}

export function contextForLevel (level) {
  if (!outlinesForLevel(level).length) return []
  return outlines.regions[level.region].context ?? []
}
