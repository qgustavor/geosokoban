import test from 'node:test'
import assert from 'node:assert/strict'
import { createGenerationClient } from '../src/core/generation-client.js'

class FakeWorker {
  terminated = 0
  messages = []
  postMessage (message) {
    this.messages.push(message)
  }

  terminate () {
    this.terminated++
  }

  emit (data) {
    this.onmessage?.({ data })
  }
}
function fixture () {
  const workers = []
  const client = createGenerationClient(() => {
    const worker = new FakeWorker(); workers.push(worker); return worker
  })
  return { client, workers }
}

test('successful requests reuse one worker and clone geography only once', async () => {
  const { client, workers } = fixture()
  const geography = { fixture: true }
  const progress = []
  let request = client.generate('first', geography, value => progress.push(value))
  workers[0].emit({ type: 'progress', stage: 'map' })
  workers[0].emit({ type: 'complete', level: { id: 'first' } })
  assert.deepEqual(await request, { id: 'first' })
  assert.equal(progress.length, 1)
  assert.equal(workers[0].terminated, 0)
  request = client.generate('second', geography)
  assert.equal(workers.length, 1)
  assert.equal(workers[0].messages[0].geography, geography)
  assert.equal('geography' in workers[0].messages[1], false)
  workers[0].emit({ type: 'complete', level: { id: 'second' } })
  await request
  client.dispose()
  assert.equal(workers[0].terminated, 1)
})

test('cancellation terminates busy workers, ignores late replies and initializes replacements', async () => {
  const { client, workers } = fixture()
  const geography = {}
  const first = client.generate('first', geography)
  const late = workers[0].onmessage
  client.cancel()
  assert.equal(await first, null)
  assert.equal(workers[0].terminated, 1)
  const next = client.generate('next', geography)
  late({ data: { type: 'complete', level: { id: 'stale' } } })
  assert.equal(workers[1].messages[0].geography, geography)
  workers[1].emit({ type: 'complete', level: { id: 'next' } })
  assert.equal((await next).id, 'next')
  client.dispose()
})

test('errors discard the worker; changed geography is sent to a warm worker', async () => {
  const { client, workers } = fixture()
  let request = client.generate('broken', {})
  workers[0].onerror()
  await assert.rejects(request, /Generation/)
  assert.equal(workers[0].terminated, 1)
  request = client.generate('good', {})
  workers[1].emit({ type: 'complete', level: { id: 'good' } })
  await request
  const changed = { changed: true }
  request = client.generate('changed', changed)
  assert.equal(workers[1].messages[1].geography, changed)
  workers[1].emit({ type: 'complete', level: { id: 'changed' } })
  await request
  client.dispose()
})
