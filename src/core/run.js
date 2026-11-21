import { storyIndex, STORY_COUNT } from '../content/regions.js'

/** Real elapsed time: pauses, dialogue, background tabs and reloads do not stop a run. */
export function createRun (code, speedrun, now = Date.now()) {
  const chapter = storyIndex(code)
  return {
    kind: chapter ? 'story' : 'puzzle',
    code,
    // A link into the middle of Story is not a complete campaign speedrun.
    startedAt: speedrun && (!chapter || chapter === 1) ? now : null,
    finishedAt: null,
    levels: {}
  }
}

export function finishRunLevel (run, code, state, assisted, now = Date.now()) {
  if (!run) return null
  const chapter = storyIndex(code)
  return {
    ...run,
    finishedAt: !chapter || chapter === STORY_COUNT ? now : null,
    levels: { ...run.levels, [code]: { moves: state.moves, pushes: state.pushes, assisted: !!assisted } }
  }
}

export function reopenRunLevel (run, code) {
  if (!run) return null
  const levels = { ...run.levels }
  delete levels[code]
  return { ...run, finishedAt: null, levels }
}

export function elapsedRun (run, now = Date.now()) {
  if (!Number.isFinite(run?.startedAt)) return null
  return Math.max(0, (run.finishedAt ?? now) - run.startedAt)
}

export function formatElapsed (milliseconds) {
  const seconds = Math.floor(Math.max(0, milliseconds ?? 0) / 1000)
  const minutes = Math.floor(seconds / 60)
  const rest = String(seconds % 60).padStart(2, '0')
  if (minutes < 60) return `${minutes}:${rest}`
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}:${rest}`
}

export function runTotals (run) {
  const entries = Object.values(run?.levels ?? {})
  return {
    levels: entries.length,
    moves: entries.reduce((sum, level) => sum + level.moves, 0),
    pushes: entries.reduce((sum, level) => sum + level.pushes, 0),
    assisted: entries.some(level => level.assisted)
  }
}

/** Storage is optional and may have been edited. Never display NaN or a fabricated full-run time. */
export function restoreStoryRun (value) {
  if (!value || value.kind !== 'story' || !storyIndex(value.code)) return null
  if (!value.levels || typeof value.levels !== 'object' || Array.isArray(value.levels)) return null
  const levels = {}
  for (const [code, result] of Object.entries(value.levels)) {
    if (
      !storyIndex(code) ||
      !Number.isSafeInteger(result?.moves) || result.moves < 0 ||
      !Number.isSafeInteger(result?.pushes) || result.pushes < 0
    ) continue

    levels[code] = {
      moves: result.moves,
      pushes: result.pushes,
      assisted: result.assisted === true
    }
  }
  const startedAt = Number.isFinite(value.startedAt) && value.startedAt >= 0 ? value.startedAt : null
  const finishedAt = Number.isFinite(value.finishedAt) && value.finishedAt >= (startedAt ?? 0)
    ? value.finishedAt
    : null
  return { kind: 'story', code: value.code, startedAt, finishedAt, levels }
}
