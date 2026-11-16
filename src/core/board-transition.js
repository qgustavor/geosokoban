// The wrapper duration includes the LAST tile's delay, not just one tile's motion.
export const TILE_ENTER_MS = 440
export const TILE_LEAVE_MS = 260
export const ENTER_SWEEP_MS = 480
export const LEAVE_SWEEP_MS = 320

export function boardTransitionDuration (reducedMotion = false) {
  return reducedMotion ? { enter: 0, leave: 0 } : {
    enter: ENTER_SWEEP_MS + TILE_ENTER_MS,
    leave: LEAVE_SWEEP_MS + TILE_LEAVE_MS
  }
}

export function tileTransitionStyle (level, position) {
  const diagonal = (position % level.width + Math.floor(position / level.width)) / Math.max(1, level.width + level.height - 2)
  return {
    animationDelay: `${Math.round(diagonal * ENTER_SWEEP_MS)}ms`,
    '--tile-leave-delay': `${Math.round((1 - diagonal) * LEAVE_SWEEP_MS)}ms`
  }
}
