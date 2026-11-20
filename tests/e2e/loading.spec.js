import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { dailyCode } from '../../src/core/seed.js'

const fixture = JSON.parse(readFileSync(new URL('../../src/content/story-levels.json', import.meta.url)))['G2-SA-S3']
const code = dailyCode(new Date('2026-11-14T12:00:00Z'))

async function setup (page) {
  await page.clock.install({ time: new Date('2026-11-14T12:00:00Z') })
  await page.addInitScript(({ level }) => {
    localStorage.setItem('geosokoban.prototype.v2', JSON.stringify({ locale: 'en' }))

    // Control generation replies without replacing hint workers or the application's loading timers.
    const OriginalWorker = window.Worker
    window.generationRequests = 0
    window.Worker = class {
      constructor (url, options) {
        if (!String(url).includes('generate')) return new OriginalWorker(url, options)
        this.terminated = false
      }

      postMessage (request) {
        window.generationRequests++
        // Build the reply when invoked so cancellation can remove the current message handler.
        window.replyToGeneration = () => this.onmessage?.({
          data: { type: 'complete', level: { ...level, id: request.code } }
        })
        this.onmessage?.({ data: { type: 'progress', stage: 'search' } })
      }

      terminate () {
        this.terminated = true
      }
    }
  }, { level: fixture })
  await page.goto('./')
  await expect(page.locator('.level-selection')).toBeVisible()
  // Pause after boot so each test advances only the loader intervals it intends to exercise.
  await page.clock.pauseAt(new Date('2026-11-14T13:00:00Z'))
}

async function start (page) {
  await page.locator('.start-game').click()
  await expect.poll(() => page.evaluate(() => window.generationRequests)).toBe(1)
}

test('fast replies open directly without a loader', async ({ page }) => {
  await setup(page)
  await start(page)
  await page.clock.runFor(499)
  await expect(page.locator('.generation-loading')).toHaveCount(0)
  await page.evaluate(() => window.replyToGeneration())
  await expect(page.locator('.play-page')).toHaveAttribute('data-code', code)
  await page.clock.runFor(1000)
  await expect(page.locator('.generation-loading')).toHaveCount(0)
})

test('slow replies reveal the loader only after the delay, then finish in 400 ms', async ({ page }) => {
  await setup(page)
  await start(page)
  await page.clock.runFor(499)
  await expect(page.locator('.generation-loading')).toHaveCount(0)
  await page.clock.runFor(1)
  await expect(page.locator('.generation-loading')).toBeVisible()
  await page.evaluate(() => window.replyToGeneration())
  await page.clock.runFor(399)
  await expect(page.locator('.generation-loading')).toBeVisible()
  await page.clock.runFor(1)
  await expect(page.locator('.play-page')).toHaveAttribute('data-code', code)
})

test('story mode never starts generation feedback or a generation worker', async ({ page }) => {
  await setup(page)
  await page.locator('label:has(input[name="game-mode"][value="story"])').click()
  await page.locator('.start-game').click()
  await expect(page.locator('.play-page')).toHaveAttribute('data-code', 'south-america-tour-1')
  await page.clock.runFor(10000)
  await expect(page.locator('.generation-loading')).toHaveCount(0)
  expect(await page.evaluate(() => window.generationRequests)).toBe(0)
})

test('a request slower than 20 seconds remains cancellable, without an error', async ({ page }) => {
  await setup(page)
  await start(page)
  await page.clock.runFor(25000)
  await expect(page.locator('.generation-loading')).toBeVisible()
  await expect(page.locator('.generation-progress')).not.toHaveAttribute('value')
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await page.evaluate(() => window.replyToGeneration())
  await expect(page.locator('.level-selection')).toBeVisible()
  await expect(page.locator('.load-error')).toHaveCount(0)
})

test('archive setup offers a date and challenge, not a region selector', async ({ page }) => {
  await setup(page)
  await page.locator('label:has(input[name="game-mode"][value="archive"])').click()
  await expect(page.locator('#archive-date')).toHaveAttribute('max', '2026-11-14')
  await expect(page.locator('.region-picker')).toHaveCount(0)
  await expect(page.locator('input[name="challenge"]')).toHaveCount(3)
})
