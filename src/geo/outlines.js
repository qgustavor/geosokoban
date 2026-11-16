import outlines from '../content/map-outlines.json' with { type: 'json' }

/** Rendering uses prebuilt quarter-cell pixel contours, never the world loader. */
export const UNDERLAY_PIXELS_PER_CELL = outlines.pixelsPerCell

export function outlinesForLevel (level) {
  const map = outlines.regions[level.region]

  if (!map) return []

  // Region identity alone is not enough: stale geometry or different grid dimensions would misalign the art.
  // Coverage thresholds change playable floors, not the projection, so they do not participate in this check.
  const matchesProjection = level.mapVersion === outlines.mapVersion &&
    level.width === map.width &&
    level.height === map.height

  if (!matchesProjection) return []

  return map.regions
}

export function contextForLevel (level) {
  // Surrounding geography must pass the same alignment check as the country's board underlay.
  if (!outlinesForLevel(level).length) return []

  return outlines.regions[level.region].context ?? []
}
