import outlines from '../content/map-outlines.json' with { type: 'json' }

/** Rendering uses prebuilt quarter-cell pixel contours, never the world loader. */
export const UNDERLAY_PIXELS_PER_CELL = outlines.pixelsPerCell

export function outlinesForLevel (level) {
  const map = outlines.regions[level.region]
  if (!map || level.mapVersion !== outlines.mapVersion || level.width !== map.width || level.height !== map.height) return []
  return map.regions
}

export function contextForLevel (level) {
  if (!outlinesForLevel(level).length) return []
  return outlines.regions[level.region].context ?? []
}
