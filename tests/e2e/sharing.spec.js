import { test, expect } from '@playwright/test'
import { skipStory } from './story-helpers.js'
import stories from '../../src/content/story-levels.json' with { type: 'json' }

const code = 'south-america-tour-1'
const keys = { up: 'ArrowUp', right: 'ArrowRight', down: 'ArrowDown', left: 'ArrowLeft' }

async function sharingPlatform (page, native = 'available', clipboard = 'available') {
  // Observe the real UI-to-platform calls without trying to automate an operating-system share sheet.
  await page.addInitScript(({ native, clipboard }) => {
    localStorage.setItem('geosokoban.prototype.v2', JSON.stringify({ locale: 'en', reduced: true }))
    window.sharingProbe = { shares: [], copied: [], activations: [] }

    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true })
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: native === 'unavailable' ? undefined : async data => {
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
  await skipStory(page)
}

async function openPause (page) {
  await openPuzzle(page)
  await page.getByRole('button', { name: 'Menu', exact: true }).click()
}

async function finishPuzzle (page) {
  await openPuzzle(page)
  await page.locator('.board-wrap').focus()

  for (const direction of stories['G2-SA-S1'].solution) {
    await page.keyboard.press(keys[direction])
  }

  await expect(page.getByRole('button', { name: 'Share your result', exact: true })).toBeVisible()
}

test('one pause-menu tap invokes native sharing with the puzzle link and active user gesture', async ({ page }) => {
  await sharingPlatform(page)
  await openPause(page)
  await page.getByRole('button', { name: 'Share puzzle', exact: true }).click()

  const probe = await page.evaluate(() => window.sharingProbe)

  expect(probe.shares).toEqual([{ title: 'GeoSokoban', url: page.url() }])
  expect(probe.activations).toEqual([true])
  expect(probe.copied).toEqual([])
  await expect(page.locator('.puzzle-code textarea, .share-text')).toHaveCount(0)
  await expect(page.getByRole('dialog')).toHaveCount(1)
})

test('native cancellation leaves the pause menu alone without copying or showing fallback text', async ({ page }) => {
  await sharingPlatform(page, 'cancelled')
  await openPause(page)
  await page.getByRole('button', { name: 'Share puzzle', exact: true }).click()

  const probe = await page.evaluate(() => window.sharingProbe)

  expect(probe.shares).toHaveLength(1)
  expect(probe.copied).toEqual([])
  await expect(page.locator('.puzzle-code textarea, .share-text, .puzzle-code [role="status"]')).toHaveCount(0)
  await expect(page.getByRole('dialog')).toHaveCount(1)
})

for (const native of ['unavailable', 'failed']) {
  test(`${native} native sharing copies the puzzle link without a second action`, async ({ page }) => {
    await sharingPlatform(page, native)
    await openPause(page)
    await page.getByRole('button', { name: 'Share puzzle', exact: true }).click()

    await expect(page.locator('.puzzle-code [role="status"]')).toHaveText('Copied!')
    expect(await page.evaluate(() => window.sharingProbe.copied)).toEqual([page.url()])
    await expect(page.locator('.puzzle-code textarea, .share-text')).toHaveCount(0)
    await expect(page.getByRole('dialog')).toHaveCount(1)
  })
}

test('manual sharing stays inside pause and disappears when play resumes', async ({ page }) => {
  await sharingPlatform(page, 'unavailable', 'denied')
  await openPause(page)
  await page.getByRole('button', { name: 'Share puzzle', exact: true }).click()

  const fallback = page.locator('.puzzle-code textarea')

  await expect(fallback).toHaveValue(page.url())
  await expect(page.locator('.share-text')).toHaveCount(0)
  await expect(page.getByRole('dialog')).toHaveCount(1)
  await fallback.focus()
  expect(await fallback.evaluate(element => element.selectionEnd - element.selectionStart)).toBe(page.url().length)

  await page.getByRole('button', { name: 'Resume', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('.share-text')).toHaveCount(0)
  await expect(page.locator('.board-wrap')).toBeFocused()
})

test('explicit Copy puzzle link bypasses native sharing', async ({ page }) => {
  await sharingPlatform(page)
  await openPause(page)
  await page.getByRole('button', { name: 'Copy puzzle link', exact: true }).click()

  await expect(page.locator('.puzzle-code [role="status"]')).toHaveText('Copied!')
  const probe = await page.evaluate(() => window.sharingProbe)

  expect(probe.shares).toEqual([])
  expect(probe.copied).toEqual([page.url()])
})

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
