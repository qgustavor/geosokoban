import test from 'node:test'
import assert from 'node:assert/strict'
import { shareResult } from '../src/core/share.js'

const data = {
  title: 'GeoSokoban',
  text: 'GeoSokoban · Easy · 12 moves · without hints',
  url: 'https://example.test/#/puzzle/south-america-tour-1?g=learn'
}
const fallbackText = `${data.text}\n${data.url}`

test('native sharing starts before any asynchronous boundary and does not copy after success', async () => {
  const calls = []
  let finishShare
  const platform = {
    canShare (received) {
      assert.equal(this, platform)
      assert.equal(received, data)
      calls.push('canShare')
      return true
    },
    share (received) {
      assert.equal(this, platform)
      assert.equal(received, data)
      calls.push('share')
      return new Promise(resolve => {
        finishShare = resolve
      })
    },
    clipboard: {
      writeText () {
        calls.push('copy')
      }
    }
  }

  const pending = shareResult(data, platform)

  // Calling share synchronously keeps the original click's activation available to the browser.
  assert.deepEqual(calls, ['canShare', 'share'])
  finishShare()
  assert.deepEqual(await pending, { status: 'shared' })
  assert.deepEqual(calls, ['canShare', 'share'])
})

test('native sharing does not require a canShare implementation', async () => {
  const received = []
  const result = await shareResult(data, {
    share (payload) {
      received.push(payload)
    }
  })

  assert.deepEqual(received, [data])
  assert.deepEqual(result, { status: 'shared' })
})

test('a cancelled native chooser never copies or exposes a second sharing dialog', async () => {
  const copied = []
  const result = await shareResult(data, {
    share () {
      return Promise.reject(new DOMException('Cancelled', 'AbortError'))
    },
    clipboard: {
      writeText (text) {
        copied.push(text)
      }
    }
  })

  assert.deepEqual(result, { status: 'cancelled' })
  assert.deepEqual(copied, [])
})

test('an unsupported native payload goes straight to the clipboard', async () => {
  const calls = []
  const result = await shareResult(data, {
    canShare: () => false,
    share () {
      calls.push('share')
    },
    clipboard: {
      writeText (text) {
        calls.push(text)
      }
    }
  })

  assert.deepEqual(result, { status: 'copied' })
  assert.deepEqual(calls, [fallbackText])
})

test('without native sharing, copying starts immediately and preserves the clipboard receiver', async () => {
  const copied = []
  const clipboard = {
    writeText (text) {
      assert.equal(this, clipboard)
      copied.push(text)
    }
  }

  const pending = shareResult(data, { clipboard })

  assert.deepEqual(copied, [fallbackText])
  assert.deepEqual(await pending, { status: 'copied' })
})

test('a native failure falls back to copying instead of requiring a second click', async () => {
  const copied = []
  const result = await shareResult(data, {
    share () {
      return Promise.reject(new DOMException('Unavailable', 'DataError'))
    },
    clipboard: {
      writeText (text) {
        copied.push(text)
      }
    }
  })

  assert.deepEqual(result, { status: 'copied' })
  assert.deepEqual(copied, [fallbackText])
})

test('a throwing native capability check still allows clipboard sharing', async () => {
  const copied = []
  const result = await shareResult(data, {
    canShare () {
      throw new DOMException('Blocked', 'NotAllowedError')
    },
    share () {
      assert.fail('A failed capability check must not start native sharing')
    },
    clipboard: {
      writeText (text) {
        copied.push(text)
      }
    }
  })

  assert.deepEqual(result, { status: 'copied' })
  assert.deepEqual(copied, [fallbackText])
})

test('clipboard rejection retains the complete text for manual copying', async () => {
  const result = await shareResult(data, {
    clipboard: {
      writeText () {
        return Promise.reject(new DOMException('Permission denied', 'NotAllowedError'))
      }
    }
  })

  assert.deepEqual(result, { status: 'fallback', text: fallbackText })
})

test('a failed native share followed by a denied clipboard keeps manual sharing available', async () => {
  const result = await shareResult(data, {
    share () {
      throw new DOMException('Blocked', 'NotAllowedError')
    },
    clipboard: {
      writeText () {
        throw new DOMException('Activation consumed', 'NotAllowedError')
      }
    }
  })

  assert.deepEqual(result, { status: 'fallback', text: fallbackText })
})

test('missing browser capabilities expose the same manual fallback', async () => {
  for (const platform of [null, {}, { clipboard: {} }, { clipboard: { writeText: null } }]) {
    assert.deepEqual(await shareResult(data, platform), { status: 'fallback', text: fallbackText })
  }
})

test('sharing an unfinished puzzle copies only its link, without a blank line or result metadata', async () => {
  const copied = []
  const invitation = { title: data.title, url: data.url }
  const result = await shareResult(invitation, {
    clipboard: {
      writeText (text) {
        copied.push(text)
      }
    }
  })

  assert.deepEqual(result, { status: 'copied' })
  assert.deepEqual(copied, [data.url])
  assert.deepEqual(await shareResult(invitation, {}), { status: 'fallback', text: data.url })
})
