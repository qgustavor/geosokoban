import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { Worker } from 'node:worker_threads'
import { createGenerationClient } from '../src/core/generation-client.js'
import { assertPlayable } from './support.js'

test('a cancelled request cannot replace the board returned by its successor', async t => {
  const workers = []
  const client = createGenerationClient(() => {
    const worker = { postMessage () {}, terminate () {} }
    workers.push(worker)
    return worker
  })
  t.after(() => client.dispose())
  const first = client.generate('2026-11-19', {})
  const staleReply = workers[0].onmessage
  const second = client.generate('2026-11-20', {})
  staleReply({ data: { type: 'complete', level: { id: '2026-11-19' } } })
  workers[1].onmessage({ data: { type: 'complete', level: { id: '2026-11-20' } } })
  assert.equal(await first, null)
  assert.deepEqual(await second, { id: '2026-11-20' })
})

test('the real generation worker returns the same playable board when reused', { timeout: 30000 }, async t => {
  const geography = JSON.parse(gunzipSync(readFileSync(new URL('../src/data/world.geojson.gz', import.meta.url))))
  const worker = new Worker(new URL('../scripts/benchmark-worker.js', import.meta.url))
  t.after(() => worker.terminate())

  function request (message) {
    return new Promise((resolve, reject) => {
      function cleanup () {
        worker.off('message', receive)
        worker.off('error', fail)
        worker.off('exit', exit)
      }
      function fail (error) {
        cleanup()
        reject(error)
      }
      function exit (code) {
        fail(new Error(`Worker exited before replying: ${code}`))
      }
      function receive (data) {
        if (data.type === 'progress') return
        cleanup()
        if (data.type === 'complete') resolve(data.level)
        else reject(new Error('Worker could not prepare the puzzle'))
      }
      worker.on('message', receive)
      worker.once('error', fail)
      worker.once('exit', exit)
      worker.postMessage(message)
    })
  }

  const code = 'south-america-calm-bay-10'
  const first = await request({ code, geography })
  assert.equal(first.id, code)
  assertPlayable(first)
  const again = await request({ code })
  assert.deepEqual(again, first)
})
