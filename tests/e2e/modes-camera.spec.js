import { test, expect } from '@playwright/test'
import { cachePuzzles } from './puzzle-helpers.js'
import { skipStory } from './story-helpers.js'
import { storyCode, storyIndex, STORY_COUNT } from '../../src/content/regions.js'
import { storyLevel } from '../../src/content/story.js'
import { createRun, finishRunLevel } from '../../src/core/run.js'

const today = '2026-11-19'
const keys = { up: 'ArrowUp', right: 'ArrowRight', down: 'ArrowDown', left: 'ArrowLeft' }

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(`${today}T12:00:00Z`) })
  await page.addInitScript(() => {
    if (!localStorage.getItem('geosokoban.prototype.v2')) {
      localStorage.setItem('geosokoban.prototype.v2', JSON.stringify({ locale: 'en', reduced: true }))
    }
  })
})

test('the archive has arrows and a bounded date, and forced future routes return home silently', async ({ page }) => {
  let mapRequests = 0
  await page.route(/world.*geojson/, route => {
    mapRequests++
    return route.abort()
  })
  await page.goto('./')
  await page.locator('label:has(input[value="archive"])').click()
  const date = page.locator('#archive-date')
  await expect(date).toHaveValue('2026-11-18')
  await expect(date).toHaveAttribute('max', today)
  await page.getByRole('button', { name: 'Next day', exact: true }).click()
  await expect(date).toHaveValue(today)
  await expect(page.getByRole('button', { name: 'Next day', exact: true })).toBeDisabled()
  await date.fill('2026-11-20')
  await expect(page.locator('.start-game')).toBeDisabled()
  await page.goto('./#/puzzle/2026-11-20-hard')
  await expect(page.locator('.level-selection')).toBeVisible()
  await expect(page).toHaveURL(/#\/$/)
  await expect(page.locator('.load-error, .notice')).toHaveCount(0)
  expect(mapRequests).toBe(0)
})

test('the date and difficulty reproduce the same board across phone and desktop camera sizes', async ({ page }) => {
  const [fixture] = await cachePuzzles(page, ['2026-11-18-hard'])
  await page.goto('./#/puzzle/2026-11-18-hard')
  await expect(page.locator('.play-page')).toHaveAttribute('data-code', fixture.id)
  const positions = () => page.locator('.box-actor').evaluateAll(boxes => boxes.map(box => box.getAttribute('style')))
  const before = await positions()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.setViewportSize({ width: 1280, height: 800 })
  expect(await positions()).toEqual(before)
  await expect(page.locator('.move-counter b')).toHaveText('0')
  await expect(page.locator('.target-flag')).toHaveCount(0)
})

test('speedrun is in options only, persists, and does not start a timer midway through an existing story', async ({ page }) => {
  await page.goto('./')
  await expect(page.locator('.speedrun-option')).toHaveCount(0)
  await page.locator('label:has(input[value="story"])').click()
  await page.locator('.start-game').click()
  await skipStory(page)
  await expect(page.locator('.run-timer')).toHaveCount(0)
  await page.getByRole('button', { name: 'Menu', exact: true }).click()
  await page.getByRole('button', { name: 'Options', exact: true }).click()
  await page.locator('.speedrun-option input').check()
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await page.getByRole('button', { name: 'Resume', exact: true }).click()
  await expect(page.locator('.run-timer')).toHaveCount(0)
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('geosokoban.prototype.v2')).speedrun)).toBe(true)
  await page.goto(`./#/puzzle/${today}`)
  // Do not wait for procedural generation: another test covers starting timed dated fixtures.
  await page.goto('./')
  await page.getByRole('button', { name: 'Options', exact: true }).click()
  await expect(page.locator('.speedrun-option input')).toBeChecked()
})

test('a timed dated result freezes and includes its date, difficulty, moves and elapsed time when shared', async ({ page }) => {
  const [level] = await cachePuzzles(page, [today])
  await page.addInitScript(() => {
    localStorage.setItem('geosokoban.prototype.v2', JSON.stringify({ locale: 'en', reduced: true, speedrun: true }))
    window.sharedResult = null
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async data => {
        window.sharedResult = data
      }
    })
  })
  await page.goto(`./#/puzzle/${today}`)
  await expect(page.locator('.run-timer')).toBeVisible()
  await page.clock.runFor(12000)
  await page.locator('.board-wrap').focus()
  for (const direction of level.solution) await page.keyboard.press(keys[direction])
  await page.clock.runFor(3200)
  await expect(page.locator('.result-title')).toHaveText('Daily challenge complete!')
  const time = await page.locator('.result-time strong').textContent()
  await page.clock.runFor(10000)
  await expect(page.locator('.result-time strong')).toHaveText(time)
  await page.getByRole('button', { name: 'Share your result', exact: true }).click()
  const shared = await page.evaluate(() => window.sharedResult)
  expect(shared.text).toContain(today)
  expect(shared.text).toContain('moves')
  expect(shared.text).toContain(`Speedrun: ${time}`)
})

test('the campaign ending shows one aggregate result and excludes epilogue reading time from the clock', async ({ page }) => {
  let run = createRun(storyCode(1), true, new Date(`${today}T11:55:00Z`).getTime())
  const completed = []
  for (let index = 1; index < STORY_COUNT; index++) {
    const code = storyCode(index)
    completed.push(code)
    run = finishRunLevel(run, code, { moves: storyLevel(code).solution.length, pushes: 0 }, false)
  }
  await page.addInitScript(({ run, completed }) => {
    localStorage.setItem('geosokoban.prototype.v2', JSON.stringify({
      locale: 'en', reduced: true, speedrun: true, storyRun: run, completed
    }))
  }, { run, completed })
  const code = storyCode(STORY_COUNT)
  await page.goto(`./#/puzzle/${code}`)
  await skipStory(page)
  for (const direction of storyLevel(code).solution) await page.keyboard.press(keys[direction])
  await page.clock.runFor(3200)
  await expect(page.locator('.story-dialog')).toBeVisible()
  const time = await page.locator('.run-timer').textContent()
  await page.clock.runFor(30000)
  await expect(page.locator('.run-timer')).toHaveText(time)
  await page.locator('.story-skip').click()
  await expect(page.locator('.result-title')).toHaveText('Journey complete!')
  await expect(page.locator('.result-progress')).toHaveText('All 21 stops completed')
  await expect(page.locator('.result-time')).toBeVisible()
})

test('two-finger camera gestures leave a fresh one-finger movement usable', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Native touch regression runs in the mobile Chromium project.')
  await page.goto('./#/puzzle/south-america-tour-1')
  await skipStory(page)
  const board = page.locator('.board-wrap')
  const hud = await page.locator('.play-hud').boundingBox()
  const zoom = Number(await board.getAttribute('data-zoom'))
  const client = await page.context().newCDPSession(page)
  const touch = async (type, touchPoints) => {
    await client.send('Input.dispatchTouchEvent', { type, touchPoints })
    await page.clock.runFor(35)
  }
  await touch('touchStart', [{ id: 1, x: 150, y: 330 }, { id: 2, x: 230, y: 330 }])
  await touch('touchMove', [{ id: 1, x: 100, y: 330 }, { id: 2, x: 280, y: 330 }])
  expect(Number(await board.getAttribute('data-zoom'))).toBeGreaterThan(zoom)
  await touch('touchMove', [{ id: 1, x: 80, y: 370 }, { id: 2, x: 260, y: 370 }])
  await touch('touchEnd', [{ id: 2, x: 260, y: 370 }])
  await touch('touchMove', [{ id: 2, x: 320, y: 370 }])
  await touch('touchEnd', [])
  await expect(page.locator('.move-counter b')).toHaveText('0')
  expect(await page.evaluate(() => visualViewport.scale)).toBe(1)
  expect(await page.locator('.play-hud').boundingBox()).toEqual(hud)
  const code = await page.locator('.play-page').getAttribute('data-code')
  const direction = storyLevel(storyCode(storyIndex(code))).solution[0]
  const [dx, dy] = { up: [0, -34], right: [34, 0], down: [0, 34], left: [-34, 0] }[direction]
  await touch('touchStart', [{ id: 1, x: 180, y: 350 }])
  await touch('touchMove', [{ id: 1, x: 180 + dx, y: 350 + dy }])
  await touch('touchEnd', [])
  await expect(page.locator('.move-counter b')).toHaveText('1')
})

for (const difficulty of ['easy', 'medium', 'hard']) {
  test(`the last mode and ${difficulty} difficulty survive reloads and playing story`, async ({ page }) => {
    await page.goto('./')
    await page.locator(`label:has(input[name="challenge"][value="${difficulty}"])`).click()
    await page.locator('label:has(input[value="archive"])').click()
    await expect.poll(() => page.evaluate(() => {
      const { mode, challenge } = JSON.parse(localStorage.getItem('geosokoban.prototype.v2'))
      return { mode, challenge }
    })).toEqual({ mode: 'archive', challenge: difficulty })
    await page.reload()
    await expect(page.locator('input[name="game-mode"][value="archive"]')).toBeChecked()
    await expect(page.locator(`input[name="challenge"][value="${difficulty}"]`)).toBeChecked()
    await page.locator('label:has(input[value="story"])').click()
    await expect(page.locator('.challenge-picker')).toHaveCount(0)
    await page.reload()
    await expect(page.locator('input[name="game-mode"][value="story"]')).toBeChecked()
    await page.locator('.start-game').click()
    await skipStory(page)
    await page.getByRole('button', { name: 'Menu', exact: true }).click()
    await page.getByRole('button', { name: 'Return to main menu', exact: true }).click()
    await expect(page.locator('input[name="game-mode"][value="story"]')).toBeChecked()
    await page.locator('label:has(input[value="daily"])').click()
    await expect(page.locator(`input[name="challenge"][value="${difficulty}"]`)).toBeChecked()
    await page.reload()
    await expect(page.locator('input[name="game-mode"][value="daily"]')).toBeChecked()
    await expect(page.locator(`input[name="challenge"][value="${difficulty}"]`)).toBeChecked()
  })
}

test('a shared puzzle does not replace the chosen menu difficulty', async ({ page }) => {
  await cachePuzzles(page, [today])
  await page.goto('./')
  await page.locator('label:has(input[name="challenge"][value="hard"])').click()
  await page.goto(`./#/puzzle/${today}?g=learn`)
  await expect(page.locator('.play-page')).toHaveAttribute('data-code', today)
  await page.getByRole('button', { name: 'Menu', exact: true }).click()
  await page.getByRole('button', { name: 'Return to main menu', exact: true }).click()
  await expect(page.locator('input[name="challenge"][value="hard"]')).toBeChecked()
})
