/** A full-screen viewport with a safe margin around every playable tile. */
export function boardViewport (level, size) {
  const width = level.width * 40
  const height = level.height * 40
  const scale = Math.min(Math.max(1, size.width) / (width + 80), Math.max(1, size.height) / (height + 80))
  const viewWidth = Math.max(1, size.width) / scale
  const viewHeight = Math.max(1, size.height) / scale
  return { x: (width - viewWidth) / 2, y: (height - viewHeight) / 2, width: viewWidth, height: viewHeight }
}

/** Normalize the diagonal sweep so small and large maps reveal at the same pace. */
export function diagonalDelay (level, position) {
  return Math.round((position % level.width + Math.floor(position / level.width)) / Math.max(1, level.width + level.height - 2) * 600)
}

export function labelPlacement (level, position, viewport, size) {
  const x = (position % level.width * 40 + 20 - viewport.x) / viewport.width * size.width
  const y = (Math.floor(position / level.width) * 40 - viewport.y) / viewport.height * size.height
  const halfWidth = Math.min(110, Math.max(0, (size.width - 20) / 2))
  return { left: `${Math.max(halfWidth + 10, Math.min(size.width - halfWidth - 10, x))}px`, top: `${Math.max(48, y - 6)}px` }
}

/** Draw only exposed coastline edges; internal tile joins have no raised rim. */
export function coastlineEdges (level, position, floors = new Set(level.floors)) {
  const x = position % level.width
  const y = Math.floor(position / level.width)
  const a = x * 40
  const b = y * 40
  const edges = []
  if (y === 0 || !floors.has(position - level.width)) edges.push(`M${a},${b}h40`)
  if (x === level.width - 1 || !floors.has(position + 1)) edges.push(`M${a + 40},${b}v40`)
  if (y === level.height - 1 || !floors.has(position + level.width)) edges.push(`M${a + 40},${b + 40}h-40`)
  if (x === 0 || !floors.has(position - 1)) edges.push(`M${a},${b + 40}v-40`)
  return edges.join(' ')
}
