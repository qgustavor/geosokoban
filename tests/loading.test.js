import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { createLoadingFeedback, LOADER_DELAY_MS, LOADER_FINISH_MS } from '../src/core/loading-feedback.js'
import { generationTask } from '../src/core/generation-task.js'
import { fallbackLevel, prepareLevel } from '../src/core/prepare-level.js'
import { generate, GenerationExhausted } from '../src/core/generate.js'
import { setGeography } from '../src/geo/world.js'
import { isSolved, replay, validateLevel } from '../src/core/engine.js'
import { benchmarkCodes, summarize } from '../scripts/benchmark-utils.js'

function clock () {
  let time = 0
  let serial = 0
  const jobs = new Map()
  return {
    now: () => time,
    schedule (callback, delay) { const id = ++serial; jobs.set(id, { at: time + delay, callback }); return id },
    unschedule: id => jobs.delete(id),
    advance (ms) {
      const end = time + ms
      while (true) {
        const next = [...jobs.entries()].filter(([, job]) => job.at <= end).sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0]
        if (!next) break
        jobs.delete(next[0])
        time = next[1].at
        next[1].callback()
      }
      time = end
    },
    pending: () => jobs.size
  }
}

function fixture (options = {}) {
  const timer = clock()
  const changes = []
  const feedback = createLoadingFeedback(state => changes.push(state), { ...timer, ...options })
  return { timer, changes, feedback, state: () => changes.at(-1) }
}

class FakeWorker {
  terminated = 0
  postMessage (message) { this.request = message }
  terminate () { this.terminated++ }
  emit (data) { this.onmessage?.({ data }) }
}

test('fast generated levels never show a loader or wait for a finish animation', async () => {
  const { timer, feedback, changes } = fixture()
  feedback.start()
  timer.advance(LOADER_DELAY_MS - 1)
  feedback.progress({ stage: 'search' })
  assert.equal(await feedback.finish(), true)
  timer.advance(5000)
  assert.equal(changes.some(state => state.visible), false)
  feedback.cancel()
  assert.equal(timer.pending(), 0)
})

test('only an unanswered request at 500 ms reveals the loader', () => {
  const { timer, feedback, state } = fixture()
  feedback.start()
  timer.advance(499)
  assert.equal(state().visible, false)
  timer.advance(1)
  assert.equal(state().visible, true)
  feedback.cancel()
  assert.equal(timer.pending(), 0)
})

test('visible completion runs for 400 ms, not the estimated search duration', async () => {
  const { timer, feedback, state } = fixture()
  feedback.start(true)
  timer.advance(500)
  let done = false
  const finished = feedback.finish().then(value => { done = value })
  assert.equal(state().fraction, 1)
  timer.advance(LOADER_FINISH_MS - 1)
  await Promise.resolve()
  assert.equal(done, false)
  timer.advance(1)
  await finished
  assert.equal(done, true)
  feedback.cancel()
})

test('reduced motion has no completion hold', async () => {
  const { timer, feedback } = fixture({ reducedMotion: () => true })
  feedback.start()
  timer.advance(500)
  assert.equal(await feedback.finish(), true)
  assert.equal(timer.pending(), 0)
  feedback.cancel()
})

test('long generation stays cancellable and becomes indeterminate without failing', async () => {
  const { timer, feedback, state } = fixture()
  feedback.start()
  timer.advance(25000)
  assert.equal(state().visible, true)
  assert.equal(state().indeterminate, true)
  assert.ok(state().fraction < 1)
  const finished = feedback.finish()
  assert.equal(state().indeterminate, false)
  timer.advance(400)
  assert.equal(await finished, true)
  feedback.cancel()
})

test('retries never move the displayed stage or fraction backward', () => {
  const { timer, feedback, state, changes } = fixture()
  feedback.start()
  feedback.progress({ stage: 'search' })
  timer.advance(1000)
  feedback.progress({ stage: 'map' })
  assert.equal(state().stage, 'search')
  timer.advance(1000)
  const shown = changes.filter(value => value.visible)
  assert.ok(shown.every((value, index) => index === 0 || value.fraction >= shown[index - 1].fraction))
  feedback.cancel()
})

test('cancelling before display prevents a ghost loader on the next request', () => {
  const { timer, feedback, state } = fixture()
  feedback.start()
  timer.advance(400)
  feedback.cancel()
  feedback.start()
  timer.advance(100)
  assert.equal(state().visible, false)
  timer.advance(400)
  assert.equal(state().visible, true)
  feedback.cancel()
})

test('cancelling the completion animation resolves the pending request as cancelled', async () => {
  const { timer, feedback, state } = fixture()
  feedback.start()
  timer.advance(500)
  const finished = feedback.finish()
  timer.advance(100)
  feedback.cancel()
  assert.equal(await finished, false)
  timer.advance(10000)
  assert.equal(state().visible, false)
  assert.equal(timer.pending(), 0)
})

test('worker progress does not terminate the worker or complete its request', async () => {
  const worker = new FakeWorker()
  const updates = []
  const task = generationTask(worker, { code: 'test' }, value => updates.push(value))
  let settled = false
  task.promise.then(() => { settled = true })
  worker.emit({ type: 'progress', stage: 'search' })
  await Promise.resolve()
  assert.equal(worker.terminated, 0)
  assert.equal(settled, false)
  assert.equal(updates.length, 1)
  worker.emit({ type: 'complete', level: { id: 'test' } })
  assert.deepEqual(await task.promise, { id: 'test' })
  assert.equal(worker.terminated, 1)
})

test('cancelled workers cannot deliver a stale board', async () => {
  const worker = new FakeWorker()
  const task = generationTask(worker, {})
  task.cancel()
  worker.emit({ type: 'complete', level: { id: 'late' } })
  assert.equal(await task.promise, null)
  assert.equal(worker.terminated, 1)
  task.cancel()
  assert.equal(worker.terminated, 1)
})

test('worker failures are errors rather than invented successful boards', async () => {
  for (const kind of ['error-message', 'worker-error', 'message-error']) {
    const worker = new FakeWorker()
    const task = generationTask(worker, {})
    if (kind === 'error-message') worker.emit({ type: 'error', error: true })
    else if (kind === 'worker-error') worker.onerror()
    else worker.onmessageerror()
    await assert.rejects(task.promise, /Generation/)
    assert.equal(worker.terminated, 1)
  }
})

test('all internal regions have deterministic, replay-verified fallback boards in both difficulties', () => {
  for (const region of ['SA', 'NA', 'CAR', 'EE', 'WE', 'AF', 'AS', 'OC']) {
    for (const planning of [false, true]) {
      const request = { code: `G2-${region === 'CAR' ? 'NA' : region}-0123456789${planning ? '-P' : ''}`, region, planning }
      const level = fallbackLevel(request)
      assert.deepEqual(level, fallbackLevel(request))
      assert.equal(level.region, region)
      assert.equal(!!level.planning, planning)
      assert.equal(level.boxes.length, 3)
      assert.equal(level.id, request.code)
      assert.equal(level.generationSource, 'fallback')
      assert.deepEqual(validateLevel(level), [])
      const result = replay(level, level.solution)
      assert.equal(result.valid && isSolved(level, result.state), true)
    }
  }
})

test('search exhaustion selects a verified fallback; arbitrary exceptions do not', () => {
  const code = 'G2-OC-0123456789-P'
  const updates = []
  const level = prepareLevel(code, {
    generator: () => { throw new GenerationExhausted(code, 'OC', true) },
    onProgress: value => updates.push(value)
  })
  assert.equal(level.generationSource, 'fallback')
  assert.equal(updates.at(-1).stage, 'ready')
  assert.throws(() => prepareLevel(code, { generator: () => { throw new Error('broken asset') } }), /broken asset/)
})

test('fallback callers cannot mutate the frozen pool', () => {
  const request = { code: 'G2-SA-0123456789', region: 'SA', planning: false }
  const level = fallbackLevel(request)
  level.boxes[0].position = -1
  assert.notEqual(fallbackLevel(request).boxes[0].position, -1)
})

test('progress observers do not alter seeded generation', () => {
  setGeography(JSON.parse(gunzipSync(readFileSync(new URL('../src/data/world.geojson.gz', import.meta.url)))))
  const code = 'G2-SA-0123456789'
  const updates = []
  const level = prepareLevel(code, { onProgress: value => updates.push(value) })
  assert.deepEqual(level, prepareLevel(code))
  assert.equal(updates[0].stage, 'map')
  assert.equal(updates.at(-1).stage, 'ready')
})

test('benchmark failures cannot make the under-threshold percentage look better', () => {
  const stats = summarize([{ ok: true, ms: 100 }, { ok: false, ms: 10 }, { ok: true, ms: 600 }])
  assert.equal(stats.completedUnder500msPercent, 100 / 3)
  assert.equal(stats.failed, 1)
  assert.equal(stats.p80Ms, 600)
  assert.deepEqual(benchmarkCodes(2), benchmarkCodes(2))
  assert.equal(benchmarkCodes(2).length, 28)
})

test('story loading bypasses feedback and random setup has no region dropdown', () => {
  const session = readFileSync(new URL('../src/composables/useSession.js', import.meta.url), 'utf8')
  assert.match(session, /if \(!cached\) \{[\s\S]*feedback.start/)
  assert.doesNotMatch(session, /deadline|20000|setTimeout/)
  const home = readFileSync(new URL('../src/ui/HomeView.vue', import.meta.url), 'utf8')
  assert.doesNotMatch(home, /randomRegion|region-picker|chooseRegion/)
})
