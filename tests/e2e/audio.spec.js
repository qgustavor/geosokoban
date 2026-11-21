import { test, expect } from '@playwright/test'
import { skipStory } from './story-helpers.js'
import stories from '../../src/content/story-levels.json' with { type: 'json' }

const code = 'south-america-tour-1'
const keys = { up: 'ArrowUp', right: 'ArrowRight', down: 'ArrowDown', left: 'ArrowLeft' }

async function audioProbe (page, saved = {}) {
  await page.addInitScript(saved => {
    const key = 'geosokoban.prototype.v2'
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify({ locale: 'en', reduced: true, ...saved }))
    }

    // Observe the real Web Audio implementation instead of replacing its activation or scheduling behavior.
    const Context = window.AudioContext
    window.audioProbe = { contexts: [], notes: 0, activation: [] }
    window.AudioContext = class extends Context {
      constructor (...args) {
        super(...args)
        window.audioProbe.contexts.push(this)
        window.audioProbe.activation.push(navigator.userActivation.isActive)
      }

      createOscillator () {
        window.audioProbe.notes++
        return super.createOscillator()
      }
    }
  }, saved)
}

async function openOptions (page) {
  await page.getByRole('button', { name: 'Options', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Options', exact: true })).toBeVisible()
}

test('music starts off, both channels have independent controls, and choices survive reload', async ({ page }) => {
  await audioProbe(page)
  await page.goto('./')
  expect(await page.evaluate(() => window.audioProbe.contexts.length)).toBe(0)
  await openOptions(page)
  await expect(page.getByRole('checkbox', { name: 'Music', exact: true })).not.toBeChecked()
  await expect(page.getByRole('checkbox', { name: 'Sound effects', exact: true })).toBeChecked()
  await expect(page.getByRole('slider', { name: 'Music volume', exact: true })).toBeDisabled()

  await page.getByRole('checkbox', { name: 'Music', exact: true }).check()
  await page.getByRole('slider', { name: 'Music volume', exact: true }).fill('23')
  await page.getByRole('checkbox', { name: 'Sound effects', exact: true }).uncheck()
  await expect.poll(() => page.evaluate(() => window.audioProbe.notes)).toBeGreaterThan(0)
  expect(await page.evaluate(() => window.audioProbe.contexts.length)).toBe(1)
  expect(await page.evaluate(() => window.audioProbe.activation)).toEqual([true])

  await page.reload()
  expect(await page.evaluate(() => window.audioProbe.contexts.length)).toBe(0)
  await openOptions(page)
  await expect(page.getByRole('checkbox', { name: 'Music', exact: true })).toBeChecked()
  await expect(page.getByRole('slider', { name: 'Music volume', exact: true })).toHaveValue('23')
  await expect(page.getByRole('checkbox', { name: 'Sound effects', exact: true })).not.toBeChecked()
})

test('real board input emits effects, while muting keeps all later moves silent', async ({ page }) => {
  await audioProbe(page)
  await page.goto(`./#/puzzle/${code}?g=learn`)
  await skipStory(page)
  await expect.poll(() => page.evaluate(() => window.audioProbe.contexts[0]?.state)).toBe('running')
  await page.locator('.board-wrap').focus()
  await page.keyboard.press(keys[stories['G2-SA-S1'].solution[0]])
  await expect(page.locator('.move-counter b')).toHaveText('1')
  await expect.poll(() => page.evaluate(() => window.audioProbe.notes)).toBeGreaterThan(0)

  await page.getByRole('button', { name: 'Menu', exact: true }).click()
  await openOptions(page)
  await page.getByRole('checkbox', { name: 'Sound effects', exact: true }).uncheck()
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await page.getByRole('button', { name: 'Resume', exact: true }).click()
  const notes = await page.evaluate(() => window.audioProbe.notes)
  await page.locator('.board-wrap').focus()
  await page.keyboard.press(keys[stories['G2-SA-S1'].solution[1]])
  await expect(page.locator('.move-counter b')).toHaveText('2')
  expect(await page.evaluate(() => window.audioProbe.notes)).toBe(notes)
})

test('a returning music preference waits for interaction and survives page lifecycle pauses', async ({ page }) => {
  await audioProbe(page, { music: true })
  await page.goto('./')
  expect(await page.evaluate(() => window.audioProbe.contexts.length)).toBe(0)
  await openOptions(page)
  await expect.poll(() => page.evaluate(() => window.audioProbe.contexts[0]?.state)).toBe('running')

  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')))
  await expect.poll(() => page.evaluate(() => window.audioProbe.contexts[0].state)).toBe('suspended')
  await page.evaluate(() => window.dispatchEvent(new Event('pageshow')))
  await expect.poll(() => page.evaluate(() => window.audioProbe.contexts[0].state)).toBe('running')
  expect(await page.evaluate(() => window.audioProbe.contexts.length)).toBe(1)
})

test('puzzles remain playable when Web Audio is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('geosokoban.prototype.v2', JSON.stringify({ locale: 'en', reduced: true, music: true }))
    window.AudioContext = undefined
    window.webkitAudioContext = undefined
  })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`./#/puzzle/${code}?g=learn`)
  await skipStory(page)
  await page.locator('.board-wrap').focus()
  await page.keyboard.press(keys[stories['G2-SA-S1'].solution[0]])
  await expect(page.locator('.move-counter b')).toHaveText('1')
  expect(errors).toEqual([])
})
