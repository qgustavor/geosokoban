import { test, expect } from '@playwright/test'
import stories from '../../src/content/story-levels.json' with { type: 'json' }
import templates from '../../src/content/fallback-levels-v5.json' with { type: 'json' }

async function preferences (page, reduced = false) {
  await page.addInitScript(reduced => localStorage.setItem('geosokoban.prototype.v2', JSON.stringify({ locale: 'en', reduced })), reduced)
}

test('same-region and cross-region navigation dismantle the old board before building the next', async ({ page }) => {
  await preferences(page)
  await page.goto('./#/puzzle/G2-SA-S1')
  await expect(page.locator('.play-page')).toHaveAttribute('aria-busy', 'false')
  for (const [previous, next] of [['G2-SA-S1', 'G2-SA-S2'], ['G2-SA-S2', 'G2-NA-S1']]) {
    await page.evaluate(code => {
      location.hash = `/puzzle/${code}`
    }, next)
    await expect(page.locator('.board-swap-leave-active')).toHaveAttribute('data-level', previous)
    await expect(page.locator('.play-page')).toHaveAttribute('aria-busy', 'true')
    await page.keyboard.press('ArrowRight')
    await expect(page.locator('.move-counter b')).toHaveText('0')
    await expect(page.locator('.board-swap-enter-active')).toHaveAttribute('data-level', next)
    await expect(page.locator('.play-page')).toHaveAttribute('aria-busy', 'false')
    await expect(page.locator('.board-wrap')).toHaveCount(1)
    await expect(page.locator('.board-wrap')).toBeFocused()
    await expect(page.locator('.flight-overlay')).toHaveCount(0)
  }
})

test('reduced motion swaps immediately and never leaves controls inert', async ({ page }) => {
  await preferences(page, true)
  await page.goto('./#/puzzle/G2-SA-S1')
  await page.evaluate(() => {
    location.hash = '/puzzle/G2-SA-S2'
  })
  await expect(page.locator('.board-wrap')).toHaveAttribute('data-level', 'G2-SA-S2')
  await expect(page.locator('.play-page')).toHaveAttribute('aria-busy', 'false')
  await expect(page.locator('.board-swap-enter-active, .board-swap-leave-active')).toHaveCount(0)
  await page.locator('.board-wrap').focus()
  const keys = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }
  await page.keyboard.press(keys[stories['G2-SA-S2'].solution[0]])
  await expect(page.locator('.move-counter b')).toHaveText('1')
})

test('rapid navigation during a transition settles on the newest route', async ({ page }) => {
  await preferences(page)
  await page.goto('./#/puzzle/G2-SA-S1')
  await expect(page.locator('.play-page')).toHaveAttribute('aria-busy', 'false')
  await page.evaluate(() => {
    location.hash = '/puzzle/G2-SA-S2'
  })
  await expect(page.locator('.board-swap-leave-active')).toBeVisible()
  await page.evaluate(() => {
    location.hash = '/puzzle/G2-SA-S3'
  })
  await expect(page.locator('.board-wrap')).toHaveAttribute('data-level', 'G2-SA-S3')
  await expect(page.locator('.play-page')).toHaveAttribute('aria-busy', 'false')
})

test('generated boards use memory and persistent caches; different codes share a warm worker', async ({ page }) => {
  const fixture = Object.values(templates).find(level => level.region === 'SA' && !level.planning)
  await preferences(page, true)
  await page.addInitScript(level => {
    const NativeWorker = window.Worker
    window.generationMessages = []
    window.generationWorkers = 0
    window.Worker = class {
      constructor (url, options) {
        if (!String(url).includes('generate')) return new NativeWorker(url, options)
        window.generationWorkers++
      }

      postMessage (message) {
        window.generationMessages.push({ code: message.code, geography: !!message.geography })
        queueMicrotask(() => this.onmessage?.({ data: { type: 'complete', level: { ...level, id: message.code } } }))
      }

      terminate () {}
    }
  }, fixture)
  const first = 'G2-SA-1111111111'
  const second = 'G2-SA-2222222222'
  await page.goto(`./#/puzzle/${first}`)
  await expect(page.locator('.play-page')).toHaveAttribute('data-code', first)
  await page.evaluate(code => {
    location.hash = `/puzzle/${code}`
  }, second)
  await expect(page.locator('.play-page')).toHaveAttribute('data-code', second)
  expect(await page.evaluate(() => window.generationWorkers)).toBe(1)
  expect(await page.evaluate(() => window.generationMessages.map(message => message.geography))).toEqual([true, false])
  await page.evaluate(code => {
    location.hash = `/puzzle/${code}`
  }, first)
  await expect(page.locator('.play-page')).toHaveAttribute('data-code', first)
  expect(await page.evaluate(() => window.generationMessages.length)).toBe(2)
  await page.reload()
  await expect(page.locator('.play-page')).toHaveAttribute('data-code', first)
  expect(await page.evaluate(() => window.generationWorkers)).toBe(0)
  await expect(page.locator('.generation-loading')).toHaveCount(0)
})

for (const code of ['G2-SA-S1', 'G2-WE-S1', 'G2-OC-S1']) {
  test(`${code} renders quarter-cell pixel coastlines and borders without loading geography`, async ({ page }) => {
    await preferences(page, true)
    let requests = 0
    await page.route(/world.*geojson/, route => {
      requests++; return route.abort()
    })
    await page.goto(`./#/puzzle/${code}`)
    await expect(page.locator('.map-outline')).toHaveAttribute('data-pixels-per-cell', '4')
    const shapes = await page.locator('.map-outline path, .country-borders path').evaluateAll(paths => paths.map(path => ({
      d: path.getAttribute('d'), rendering: getComputedStyle(path).shapeRendering
    })))
    expect(shapes.length).toBeGreaterThan(0)
    for (const { d, rendering } of shapes) {
      expect(rendering).toBe('crispedges')
      expect(d).not.toMatch(/[LACQST]/)
      expect([...d.matchAll(/-?\d+/g)].every(match => Number(match[0]) % 10 === 0)).toBe(true)
    }
    expect(requests).toBe(0)
  })
}

test('clear lettering is staggered, hops above baseline, and is announced as one phrase', async ({ page }) => {
  await preferences(page)
  await page.goto('./#/puzzle/G2-SA-S1')
  await expect(page.locator('.play-page')).toHaveAttribute('aria-busy', 'false')
  const keys = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }
  for (const direction of stories['G2-SA-S1'].solution) await page.keyboard.press(keys[direction])
  await expect(page.locator('.clear-announcement')).toBeVisible()
  await expect(page.locator('.clear-announcement .sr-only')).toHaveText('Level clear!')
  await expect(page.locator('.clear-title')).toHaveAttribute('aria-hidden', 'true')
  const letters = await page.locator('.clear-letter').evaluateAll(elements => elements.map(element => ({
    delay: Number.parseFloat(getComputedStyle(element).animationDelay),
    name: getComputedStyle(element).animationName,
    frames: element.getAnimations()[0]?.effect.getKeyframes().map(frame => frame.transform) ?? []
  })))
  expect(letters.length).toBeGreaterThan(5)
  expect(letters[1].delay).toBeGreaterThan(letters[0].delay)
  expect(letters.every(letter => letter.name === 'clear-letter-pop')).toBe(true)
  expect(letters[0].frames.some(transform => transform?.includes('translateY(-'))).toBe(true)
})
