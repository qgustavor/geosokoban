import { inject } from 'vue'

// A symbol avoids collisions with other providers while route wrappers share the shell's controller.
export const gameContext = Symbol('GeoSokoban game')

export function useGameContext () {
  const game = inject(gameContext)

  if (!game) throw new Error('Game context is unavailable')

  return game
}
