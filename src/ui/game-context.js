import { inject } from 'vue'

export const gameContext = Symbol('GeoSokoban game')

export function useGameContext () {
  const game = inject(gameContext)
  if (!game) throw new Error('Game context is unavailable')
  return game
}
