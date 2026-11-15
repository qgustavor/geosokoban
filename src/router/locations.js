import { normalizeCode } from '../core/seed.js'

export function puzzleLocation (input, guidance = 'learn') {
  const code = normalizeCode(input)
  if (!code) throw new Error('Invalid puzzle code')
  return { name: 'puzzle', params: { code }, query: { g: code.endsWith('-P') || guidance === 'remember' ? 'remember' : 'learn' } }
}

