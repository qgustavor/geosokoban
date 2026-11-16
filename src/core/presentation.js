/** A full-screen viewport with a safe margin around every playable tile. */
export function boardViewport (level, size) {
  const width = level.width * 40
  const height = level.height * 40

  // Fit both axes with one scale, reserving one 40-unit tile of margin on each side.
  // A temporarily zero-sized container still needs a nonzero scale and viewport.
  const horizontalScale = Math.max(1, size.width) / (width + 80)
  const verticalScale = Math.max(1, size.height) / (height + 80)
  const scale = Math.min(horizontalScale, verticalScale)
  const viewWidth = Math.max(1, size.width) / scale
  const viewHeight = Math.max(1, size.height) / scale

  // Center any extra space from the container's aspect ratio around the board.
  const x = (width - viewWidth) / 2
  const y = (height - viewHeight) / 2

  return { x, y, width: viewWidth, height: viewHeight }
}

/** Normalize the diagonal sweep so small and large maps reveal at the same pace. */
export function diagonalDelay (level, position) {
  const x = position % level.width
  const y = Math.floor(position / level.width)

  // Row-major cells with the same x + y reveal together. Guard the divisor for a 1x1 board.
  const lastDiagonal = Math.max(1, level.width + level.height - 2)
  const sweepProgress = (x + y) / lastDiagonal

  return Math.round(sweepProgress * 600)
}

export function labelPlacement (level, position, viewport, size) {
  // Labels live in screen pixels, while their anchors use the board's SVG coordinate space.
  // Anchor horizontally at the tile center and vertically at its top edge.
  const tileCenterX = position % level.width * 40 + 20
  const screenX = (tileCenterX - viewport.x) / viewport.width * size.width
  const tileTopY = Math.floor(position / level.width) * 40
  const screenY = (tileTopY - viewport.y) / viewport.height * size.height

  // Reserve space for half the label on either side, shrinking that allowance on narrow screens.
  const halfWidth = Math.min(110, Math.max(0, (size.width - 20) / 2))
  const left = Math.max(halfWidth + 10, Math.min(size.width - halfWidth - 10, screenX))
  const top = Math.max(48, screenY - 6)

  return { left: `${left}px`, top: `${top}px` }
}

/** Draw only exposed coastline edges; internal tile joins have no raised rim. */
export function coastlineEdges (level, position, floors = new Set(level.floors)) {
  const x = position % level.width
  const y = Math.floor(position / level.width)
  const tileLeft = x * 40
  const tileTop = y * 40
  const edges = []

  // Check board boundaries before neighboring indices so left/right edges cannot wrap to another row.
  // Keep the emitted segments in clockwise order: top, right, bottom, left.
  if (y === 0 || !floors.has(position - level.width)) edges.push(`M${tileLeft},${tileTop}h40`)
  if (x === level.width - 1 || !floors.has(position + 1)) edges.push(`M${tileLeft + 40},${tileTop}v40`)
  if (y === level.height - 1 || !floors.has(position + level.width)) {
    edges.push(`M${tileLeft + 40},${tileTop + 40}h-40`)
  }
  if (x === 0 || !floors.has(position - 1)) edges.push(`M${tileLeft},${tileTop + 40}v-40`)

  return edges.join(' ')
}
