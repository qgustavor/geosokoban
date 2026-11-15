import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { readGeographyResponse } from '../src/geo/world.js'

const compressed = readFileSync(new URL('../src/data/world.geojson.gz', import.meta.url))
const decoded = gunzipSync(compressed)
const expected = JSON.parse(decoded)

async function freshWorld () {
  return import(`../src/geo/world.js?test=${crypto.randomUUID()}`)
}

test('the shipped geography is valid gzip and GeoJSON', () => {
  assert.equal(expected.type, 'FeatureCollection')
  assert.equal(expected.features.length, 177)
})

test('raw gzip without a Content-Encoding header loads', async () => {
  assert.deepEqual(await readGeographyResponse(new Response(compressed)), expected)
})

test('already-decoded JSON is never decompressed a second time', async () => {
  const response = new Response(decoded, { headers: { 'Content-Encoding': 'gzip' } })
  assert.deepEqual(await readGeographyResponse(response), expected)
})

test('plain JSON without an encoding header also loads', async () => {
  assert.deepEqual(await readGeographyResponse(new Response(decoded)), expected)
})

test('invalid data, truncated gzip and unsuccessful responses are rejected', async () => {
  for (const response of [
    new Response('<!doctype html><h1>Not found</h1>'),
    new Response('{"type":"FeatureCollection","features":[]}'),
    new Response('{"type":"FeatureCollection","features":null}'),
    new Response(compressed.subarray(0, 30)),
    new Response('Not found', { status: 404 })
  ]) await assert.rejects(readGeographyResponse(response))
})

test('a failed map load can be retried and successful data is cached', async t => {
  const world = await freshWorld()
  let calls = 0
  t.mock.method(globalThis, 'fetch', async () => ++calls === 1
    ? new Response('Unavailable', { status: 503 })
    : new Response(compressed))
  await assert.rejects(world.loadGeography(), { code: 'MAP_LOAD_FAILED' })
  assert.deepEqual(await world.loadGeography(), expected)
  assert.deepEqual(await world.loadGeography(), expected)
  assert.equal(calls, 2)
})

test('cancelled map loads are not cached and do not poison a retry', async t => {
  const world = await freshWorld()
  const controller = new AbortController()
  let calls = 0
  t.mock.method(globalThis, 'fetch', async (_, { signal }) => {
    calls++
    if (calls === 1) {
      controller.abort()
      signal.throwIfAborted()
    }
    return new Response(decoded)
  })
  await assert.rejects(world.loadGeography({ signal: controller.signal }), { name: 'AbortError' })
  assert.deepEqual(await world.loadGeography(), expected)
  assert.equal(calls, 2)
})

test('HTTP-level gzip reproduces the former bug and loads with the corrected decoder', async t => {
  const server = createServer((request, response) => {
    response.writeHead(200, { 'Content-Type': 'application/json', 'Content-Encoding': 'gzip' })
    response.end(compressed)
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  t.after(() => { server.closeAllConnections(); server.close() })
  const url = `http://127.0.0.1:${server.address().port}/world.geojson.gz`
  const oldResponse = await fetch(url)
  const oldStream = oldResponse.body.pipeThrough(new DecompressionStream('gzip'))
  await assert.rejects(new Response(oldStream).json())
  assert.deepEqual(await readGeographyResponse(await fetch(url)), expected)
})
