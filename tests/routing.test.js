import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { puzzleLocation } from '../src/router/locations.js'

const source = path => readFileSync(new URL(path, import.meta.url), 'utf8')

test('named puzzle locations preserve the seed and both challenge settings', () => {
  assert.deepEqual(puzzleLocation('g2-sa-0123456789-p', 'remember'), {
    name: 'puzzle', params: { code: 'G2-SA-0123456789-P' }, query: { g: 'remember' }
  })
  assert.deepEqual(puzzleLocation('G2-SA-S1').query, {})
  assert.deepEqual(puzzleLocation('G2-SA-S1', 'unexpected').query, {})
})

test('invalid puzzle codes cannot become share locations', () => {
  for (const code of ['', 'bad', null, '../options', 'G2-SA-D20260230']) assert.throws(() => puzzleLocation(code))
})

test('hard puzzle routes always hide targets and do not carry a legacy redirect', () => {
  assert.equal(puzzleLocation('2026-11-18-hard', 'learn').query.g, 'remember')
  assert.doesNotMatch(source('../src/router/index.js'), /legacyPuzzleLocation/)
})

test('the application mounts without awaiting or requesting geography', () => {
  const main = source('../src/main.js')
  assert.match(main, /createApp\(App\)\.use\(createAppRouter\(\)\)\.mount/)
  assert.doesNotMatch(main, /await|loadGeography|fetch\(/)
})

test('the official hash router owns views and share navigation', () => {
  const router = source('../src/router/index.js')
  const app = source('../src/ui/App.vue')
  const controller = source('../src/composables/useGameController.js')
  assert.match(router, /history: createWebHashHistory\(\)/)
  assert.match(app, /<RouterView\s*\/>/)
  assert.match(controller, /router\.resolve\(puzzleLocation/)
  assert.doesNotMatch(controller, /replaceState|hashchange|window\.location\.hash/)
  assert.ok(JSON.parse(source('../package.json')).dependencies['vue-router'])
})

test('map loading is inside generated requests and tied to cancellation', () => {
  const session = source('../src/composables/useSession.js')
  assert.match(session, /if \(!cached\) \{[\s\S]*await loadGeography\(\{ signal: controller.signal \}\)/)
  assert.match(session, /cancelRequest = \(\) => controller.abort\(\)/)
  assert.match(session, /if \(current !== revision\) return false/)
})
