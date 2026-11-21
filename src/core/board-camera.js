import { boardViewport } from './presentation.js'

const TILE = 40
const clamp = (value, low, high) => Math.max(low, Math.min(high, value))

function cameraLimits (level, size) {
  const fit = boardViewport(level, size)
  const tilePixels = TILE * Math.max(1, size.width) / fit.width
  return { maxZoom: Math.max(4, Math.min(8, 64 / tilePixels)), tilePixels }
}

/** Camera coordinates are world units, never part of the level or its seed. */
export function clampCamera (level, size, camera) {
  const fit = boardViewport(level, size)
  const zoom = clamp(camera.zoom, 1, cameraLimits(level, size).maxZoom)
  const center = (value, span, extent) => span >= extent + TILE * 2
    ? extent / 2
    : clamp(value, span / 2 - TILE, extent + TILE - span / 2)
  return {
    zoom,
    x: center(camera.x, fit.width / zoom, level.width * TILE),
    y: center(camera.y, fit.height / zoom, level.height * TILE)
  }
}

export function cameraViewport (level, size, camera) {
  const fit = boardViewport(level, size)
  const bounded = clampCamera(level, size, camera)
  const width = fit.width / bounded.zoom
  const height = fit.height / bounded.zoom
  return { x: bounded.x - width / 2, y: bounded.y - height / 2, width, height }
}

export function initialCamera (level, size, player = level.player, readable = true) {
  const { tilePixels } = cameraLimits(level, size)
  // Start large maps at a readable scale on phones, without shrinking their puzzle grids.
  const zoom = readable && size.width <= 600 ? Math.max(1, 32 / tilePixels) : 1
  return clampCamera(level, size, {
    zoom,
    x: (player % level.width + 0.5) * TILE,
    y: (Math.floor(player / level.width) + 0.5) * TILE
  })
}

/** Keep the world point under the fingers fixed while their midpoint moves and they pinch. */
export function transformCamera (level, size, camera, { from, to, scale }) {
  const before = cameraViewport(level, size, camera)
  const zoom = clamp(camera.zoom * scale, 1, cameraLimits(level, size).maxZoom)
  const fit = boardViewport(level, size)
  const width = fit.width / zoom
  const height = fit.height / zoom
  const screenWidth = Math.max(1, size.width)
  const screenHeight = Math.max(1, size.height)
  const anchorX = before.x + from.x / screenWidth * before.width
  const anchorY = before.y + from.y / screenHeight * before.height
  return clampCamera(level, size, {
    zoom,
    x: anchorX + (0.5 - to.x / screenWidth) * width,
    y: anchorY + (0.5 - to.y / screenHeight) * height
  })
}

/** A dead zone avoids camera jitter; the next move always brings an off-screen player back. */
export function followPlayer (level, size, camera, player) {
  const viewport = cameraViewport(level, size, camera)
  const x = (player % level.width + 0.5) * TILE
  const y = (Math.floor(player / level.width) + 0.5) * TILE
  const left = viewport.x + viewport.width * 0.22
  const right = viewport.x + viewport.width * 0.78
  const top = viewport.y + viewport.height * 0.22
  const bottom = viewport.y + viewport.height * 0.78
  return clampCamera(level, size, {
    ...camera,
    x: camera.x + x - clamp(x, left, right),
    y: camera.y + y - clamp(y, top, bottom)
  })
}
