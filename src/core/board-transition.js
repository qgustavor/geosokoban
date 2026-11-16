// Keep the board mounted until the last delayed tile has finished moving,
// rather than ending the wrapper transition after a single tile's duration.
export const TILE_ENTER_MS = 440
export const TILE_LEAVE_MS = 260
export const ENTER_SWEEP_MS = 480
export const LEAVE_SWEEP_MS = 320

export function boardTransitionDuration (reducedMotion = false) {
  return reducedMotion
    ? { enter: 0, leave: 0 }
    : {
        enter: ENTER_SWEEP_MS + TILE_ENTER_MS,
        leave: LEAVE_SWEEP_MS + TILE_LEAVE_MS
      }
}

export function tileTransitionStyle (level, position) {
  // Positions are row-major indices. Equal x + y values share a diagonal, so
  // the sweep advances from the top-left corner to the bottom-right corner.
  const x = position % level.width
  const y = Math.floor(position / level.width)

  // The last diagonal is (width - 1) + (height - 1); a 1x1 board needs a nonzero divisor.
  const lastDiagonal = Math.max(1, level.width + level.height - 2)
  const sweepProgress = (x + y) / lastDiagonal
  const enterDelay = Math.round(sweepProgress * ENTER_SWEEP_MS)

  // Dismantling runs in the opposite order without changing the total sweep time.
  const leaveDelay = Math.round((1 - sweepProgress) * LEAVE_SWEEP_MS)

  return {
    animationDelay: `${enterDelay}ms`,
    '--tile-leave-delay': `${leaveDelay}ms`
  }
}
