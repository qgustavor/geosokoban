import test from 'node:test'
import assert from 'node:assert/strict'
import { mosaicPath, MAP_PIXELS_PER_CELL, MAP_PIXEL_SIZE } from '../src/geo/mosaic.js'
import atlas from '../src/content/map-outlines.json' with { type: 'json' }

function ringsFor (path) {
  const tokens = path.match(/[MLHVZ]|-?\d+(?:\.\d+)?/g) ?? []
  const rings = []
  let ring = null
  let x = 0
  let y = 0
  for (let index = 0; index < tokens.length;) {
    const command = tokens[index++]
    if (command === 'Z') continue
    if (command === 'M') {
      ring = []
      rings.push(ring)
    }
    if (command === 'M' || command === 'L') {
      x = Number(tokens[index++])
      y = Number(tokens[index++])
    } else if (command === 'H') x = Number(tokens[index++])
    else if (command === 'V') y = Number(tokens[index++])
    else assert.fail(`Unexpected path command ${command}`)
    ring.push([x, y])
  }
  return rings
}

function contains (rings, x, y) {
  let inside = false
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i]
      const [xj, yj] = ring[j]
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside
    }
  }
  return inside
}

function assertPixelCentersMatch (source, bounds = [-60, -60, 100, 100]) {
  const raw = ringsFor(source)
  const pixels = ringsFor(mosaicPath(source, bounds))
  for (let y = bounds[1] + 5; y < bounds[3]; y += 10) {
    for (let x = bounds[0] + 5; x < bounds[2]; x += 10) {
      assert.equal(contains(pixels, x, y), contains(raw, x, y), `${x},${y}`)
    }
  }
}

test('one gameplay cell contains exactly four by four logical map pixels', () => {
  assert.equal(MAP_PIXELS_PER_CELL, 4)
  assert.equal(MAP_PIXEL_SIZE, 10)
  assert.equal(mosaicPath('M0,0 L40,0 L40,40 L0,40Z'), 'M0,0H40V40H0V0Z')
  let pixels = 0
  const rings = ringsFor(mosaicPath('M0,0 L40,0 L40,40 L0,40Z'))
  for (let y = -5; y <= 45; y += 10) {
    for (let x = -5; x <= 45; x += 10) if (contains(rings, x, y)) pixels++
  }
  assert.equal(pixels, 16)
})

test('diagonal coastlines become stairs without diagonal or curved segments', () => {
  const source = 'M0,0 L40,0 L0,40Z'
  const path = mosaicPath(source)
  assert.doesNotMatch(path, /[LACQST]/)
  assert.ok((path.match(/H/g) ?? []).length > 2)
  assertPixelCentersMatch(source)
})

test('holes and separate islands survive the even-odd pixel sampling', () => {
  const source = 'M0,0 L60,0 L60,60 L0,60Z M20,20 L40,20 L40,40 L20,40Z M80,10 L90,10 L90,20 L80,20Z'
  const path = mosaicPath(source)
  assert.equal(ringsFor(path).length, 3)
  assert.equal(contains(ringsFor(path), 25, 25), false)
  assert.equal(contains(ringsFor(path), 85, 15), true)
  assertPixelCentersMatch(source)
})

test('diagonally touching pixels remain separate closed contours', () => {
  const source = 'M0,0 L10,0 L10,10 L0,10Z M10,10 L20,10 L20,20 L10,20Z'
  assert.equal(ringsFor(mosaicPath(source)).length, 2)
  assertPixelCentersMatch(source)
})

test('negative coordinates use the same global grid origin and are clipped safely', () => {
  const source = 'M-37,-23 L39,-23 L39,43 L-37,43Z'
  assertPixelCentersMatch(source)
  assert.equal(mosaicPath(source, [-20, -10, 20, 30]), 'M-20,-10H20V30H-20V-10Z')
  assert.equal(mosaicPath(source, [100, 100, 200, 200]), '')
  assert.equal(mosaicPath(''), '')
})

test('subpixel slivers do not invent land and malformed oversized projections are bounded', () => {
  assert.equal(mosaicPath('M0,0 L2,0 L2,2 L0,2Z'), '')
  assert.throws(() => mosaicPath('M0,0 L9999999,0 L9999999,9999999 L0,9999999Z'), /bounds are too large/)
})

test('every coast and country border in the committed atlas sits on the quarter-cell grid', () => {
  assert.equal(atlas.pixelsPerCell, 4)
  for (const [id, map] of Object.entries(atlas.regions)) {
    for (const region of [...map.context, ...map.regions]) {
      assert.doesNotMatch(region.path, /[LACQST]/, `${id}:${region.id}`)
      const rings = ringsFor(region.path)
      assert.ok(rings.length)
      for (const ring of rings) {
        for (let index = 0; index < ring.length; index++) {
          const [x, y] = ring[index]
          assert.equal(Math.abs(x % 10), 0)
          assert.equal(Math.abs(y % 10), 0)
          const [nextX, nextY] = ring[(index + 1) % ring.length]
          assert.ok(x === nextX || y === nextY, `${id}:${region.id} has a diagonal edge`)
        }
      }
    }
  }
})
