import test from 'node:test'
import assert from 'node:assert/strict'
import { Worker } from 'node:worker_threads'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { initialState, isSolved, replay } from '../src/core/engine.js'

const stories = JSON.parse(readFileSync(new URL('../src/content/story-levels.json', import.meta.url)))
const geography = JSON.parse(gunzipSync(readFileSync(new URL('../src/data/world.geojson.gz', import.meta.url))))

function callWorker (file, message) {
  const source = `
    import { parentPort } from 'node:worker_threads'
    globalThis.self = { postMessage: data => parentPort.postMessage(data) }
    await import(${JSON.stringify(new URL('../src/core/' + file, import.meta.url).href)})
    parentPort.on('message', data => self.onmessage({ data }))
  `
  const worker = new Worker(new URL('data:text/javascript,' + encodeURIComponent(source)))
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      worker.terminate()
      reject(new Error('Test worker timed out'))
    }, 15000)
    const finish = () => {
      clearTimeout(timeout)
      worker.terminate()
    }
    worker.on('message', data => {
      if (data.type === 'progress') return
      finish()
      resolve(data)
    })
    worker.once('error', error => { finish(); reject(error) })
    worker.postMessage(message)
  })
}

test('the exact hint-worker source solves current states in Node worker threads', async () => {
  for (const code of ['G2-SA-S2', 'G2-NA-S3-P', 'G2-OC-S3-P']) {
    const level = stories[code]
    const result = await callWorker('hint.worker.js', { level, state: initialState(level), budget: 4000 })
    assert.equal(result.status, 'solved')
    const checked = replay(level, result.moves)
    assert.equal(checked.valid, true)
    assert.equal(isSolved(level, checked.state), true)
  }
})

test('the exact generation-worker source returns verified geography and puzzle challenges', async () => {
  for (const code of ['G2-SA-0123456789', 'G2-OC-0123456789-P']) {
    const result = await callWorker('generate.worker.js', { code, geography })
    assert.equal(result.level.id, code)
    const checked = replay(result.level, result.level.solution)
    assert.equal(checked.valid, true)
    assert.equal(isSolved(result.level, checked.state), true)
  }
})

test('malformed worker requests fail without inventing a deadlock', async () => {
  const generated = await callWorker('generate.worker.js', { code: 'invalid', geography })
  assert.equal(generated.error, true)
  const hint = await callWorker('hint.worker.js', {})
  assert.equal(hint.status, 'error')
})
