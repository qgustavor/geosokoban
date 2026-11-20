import { test, expect } from '@playwright/test'
import { cachePuzzles } from './puzzle-helpers.js'

const code = '2026-11-18'
const keys = { up: 'ArrowUp', right: 'ArrowRight', down: 'ArrowDown', left: 'ArrowLeft' }

async function sharingPlatform (page, native = 'available', clipboard = 'available') {
  // Observe the real UI-to-platform calls without trying to automate an operating-system share sheet.
  await page.addInitScript(({ native, clipboard }) => {
    localStorage.setItem('geosokoban.prototype.v2', JSON.stringify({ locale: 'en', reduced: true }))
    window.sharingProbe = { shares: [], copied: [], activations: [] }

    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true })
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: native === 'unavailable'
        ? undefined
        : async data => {
          window.sharingProbe.shares.push(data)
          window.sharingProbe.activations.push(navigator.userActivation.isActive)

          if (native === 'cancelled') throw new DOMException('Cancelled', 'AbortError')
          if (native === 'failed') throw new DOMException('Unavailable', 'DataError')
        }
    })
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        async writeText (text) {
          if (clipboard === 'denied') throw new DOMException('Blocked', 'NotAllowedError')

          window.sharingProbe.copied.push(text)
        }
      }
    })
  }, { native, clipboard })
}

async function openPuzzle (page) {
  await page.goto(`./#/puzzle/${code}?g=learn`)
  await expect(page.locator('.play-page')).toHaveAttribute('data-code', code)

}

async function finishPuzzle (page) {
  const [level] = await cachePuzzles(page, [code])
  await openPuzzle(page)
  await page.locator('.board-wrap').focus()

  for (const direction of level.solution) {
    await page.keyboard.press(keys[direction])
  }

  await expect(page.getByRole('button', { name: 'Share your result', exact: true })).toBeVisible()
}

test('result sharing still reaches the native API directly with the move summary', async ({ page }) => {
  await sharingPlatform(page)
  await finishPuzzle(page)
  await page.getByRole('button', { name: 'Share your result', exact: true }).click()

  const probe = await page.evaluate(() => window.sharingProbe)

  expect(probe.shares).toHaveLength(1)
  expect(probe.shares[0].url).toBe(page.url())
  expect(probe.shares[0].text).toContain('moves')
  expect(probe.shares[0].text).toContain(code)
  expect(probe.activations).toEqual([true])
  expect(probe.copied).toEqual([])
  await expect(page.locator('.share-text')).toHaveCount(0)
})

test('copied-result feedback is visible inside the results dialog, not behind it', async ({ page }) => {
  await sharingPlatform(page, 'unavailable')
  await finishPuzzle(page)
  await page.getByRole('button', { name: 'Share your result', exact: true }).click()

  await expect(page.getByRole('dialog').getByRole('status')).toHaveText('Copied!')
  await expect(page.locator('.utility-notice, .share-text')).toHaveCount(0)
  await expect(page.getByRole('dialog')).toHaveCount(1)
  expect(await page.evaluate(() => window.sharingProbe.copied)).toHaveLength(1)
})

for (const native of ['unavailable', 'failed']) {
  test(`${native} sharing and a denied clipboard show the exact dated result for manual copying`, async ({ page }) => {
    await sharingPlatform(page, native, 'denied')
    await finishPuzzle(page)
    await page.getByRole('button', { name: 'Share your result', exact: true }).click()
    await expect(page.locator('.share-text')).toHaveValue(new RegExp(code))
    await expect(page.locator('.share-text')).toHaveValue(/moves/)
    await page.getByRole('button', { name: 'Close', exact: true }).click()
    await expect(page.locator('.result-title')).toBeVisible()
  })
}

test('cancelling the native result share does not copy or open another dialog', async ({ page }) => {
  await sharingPlatform(page, 'cancelled')
  await finishPuzzle(page)
  await page.getByRole('button', { name: 'Share your result', exact: true }).click()
  expect(await page.evaluate(() => window.sharingProbe.copied)).toEqual([])
  await expect(page.locator('.share-text')).toHaveCount(0)
  await expect(page.getByRole('dialog')).toHaveCount(1)
})
