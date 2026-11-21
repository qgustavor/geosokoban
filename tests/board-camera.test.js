import test from 'node:test'
import assert from 'node:assert/strict'
import { boardViewport } from '../src/core/presentation.js'
import { initialCamera, cameraViewport, clampCamera, transformCamera, followPlayer, cameraLimits } from '../src/core/board-camera.js'

const level = { width: 29, height: 23, player: 11 * 29 + 14 }
const phone = { width: 390, height: 650 }
const desktop = { width: 1280, height: 680 }
const near = (a, b) => assert.ok(Math.abs(a - b) < 0.000001, `${a} != ${b}`)

test('phones start with readable 32px tiles; desktops and previews retain the full map', () => {
  const camera = initialCamera(level, phone)
  const viewport = cameraViewport(level, phone, camera)
  near(phone.width / viewport.width * 40, 32)
  assert.equal(initialCamera(level, desktop).zoom, 1)
  assert.deepEqual(
    cameraViewport(level, phone, initialCamera(level, phone, level.player, false)),
    boardViewport(level, phone)
  )
  assert.deepEqual(level, { width: 29, height: 23, player: 333 })
})

test('pinch zoom preserves the world point under the fingers', () => {
  const camera = initialCamera(level, phone)
  const before = cameraViewport(level, phone, camera)
  const from = { x: 160, y: 310 }
  const to = { x: 175, y: 325 }
  const after = cameraViewport(level, phone, transformCamera(level, phone, camera, { from, to, scale: 1.4 }))
  near(before.x + from.x / phone.width * before.width, after.x + to.x / phone.width * after.width)
  near(before.y + from.y / phone.height * before.height, after.y + to.y / phone.height * after.height)
})

test('two-finger dragging pans without changing scale and never loses the whole map', () => {
  const camera = initialCamera(level, phone)
  const moved = transformCamera(level, phone, camera, { from: { x: 100, y: 100 }, to: { x: 130, y: 100 }, scale: 1 })
  assert.equal(moved.zoom, camera.zoom)
  assert.ok(moved.x < camera.x)
  const extreme = clampCamera(level, phone, { zoom: 999, x: -99999, y: 99999 })
  const viewport = cameraViewport(level, phone, extreme)
  assert.equal(extreme.zoom, cameraLimits(level, phone).maxZoom)
  assert.ok(viewport.x >= -40)
  assert.ok(viewport.y + viewport.height <= level.height * 40 + 40)
})

test('after exploring away, moving brings the player back into the camera', () => {
  const camera = clampCamera(level, phone, { zoom: 3, x: 0, y: 0 })
  const viewport = cameraViewport(level, phone, followPlayer(level, phone, camera, level.player))
  const x = (level.player % level.width + 0.5) * 40
  const y = (Math.floor(level.player / level.width) + 0.5) * 40
  assert.ok(x > viewport.x && x < viewport.x + viewport.width)
  assert.ok(y > viewport.y && y < viewport.y + viewport.height)
})

test('zero-sized transient containers and orientation changes keep a finite viewport', () => {
  for (const size of [{ width: 0, height: 0 }, { width: 844, height: 234 }, phone, desktop]) {
    const camera = clampCamera(level, size, initialCamera(level, phone))
    const viewport = cameraViewport(level, size, camera)
    assert.ok(Object.values(viewport).every(Number.isFinite))
    assert.ok(viewport.width > 0 && viewport.height > 0)
  }
})

test('sequential finger updates cannot change zoom during a pan at the zoom limit', async () => {
  const { createBoardInput } = await import('../src/core/board-input.js')
  let camera = clampCamera(level, phone, { ...initialCamera(level, phone), zoom: 99 })
  let origin
  let revision = -1
  const expected = camera.zoom
  const input = createBoardInput(() => assert.fail('Camera gestures must not move'), change => {
    if (change.gesture !== revision) {
      origin = camera
      revision = change.gesture
    }
    camera = transformCamera(level, phone, origin, change)
  })
  input.down(1, 100, 100)
  input.down(2, 200, 100)
  input.move(1, 80, 140)
  input.move(2, 180, 140)
  near(camera.zoom, expected)
  input.up(1, 80, 140)
  input.up(2, 180, 140)
  near(camera.zoom, expected)
})
