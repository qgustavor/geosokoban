import { test, expect } from '@playwright/test'
import { storyCode, STORY_COUNT } from '../../src/content/regions.js'
import { skipStory } from './story-helpers.js'
import stories from '../../src/content/story-levels.json' with { type: 'json' }

const keys = { up: 'ArrowUp', right: 'ArrowRight', down: 'ArrowDown', left: 'ArrowLeft' }

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    // Preserve progress on reload, unlike the fresh-save fixtures used by unrelated UI tests.
    if (!localStorage.getItem('geosokoban.prototype.v2')) {
      localStorage.setItem('geosokoban.prototype.v2', JSON.stringify({ locale: 'en', reduced: true }))
    }
  })
})

test('home offers modes and difficulty without a level selector or a seed-entry form', async ({ page }) => {
  await page.goto('./')
  await expect(page.locator('.mode-card')).toHaveCount(3)
  await expect(page.locator('.challenge-card')).toHaveCount(3)
  await page.locator('label:has(input[value="story"])').click()
  await expect(page.locator('.tour-stamps li')).toHaveCount(3)
  await expect(page.locator('.challenge-card')).toHaveCount(0)
  await expect(page.locator('.level-selection details, .level-selection form')).toHaveCount(0)
  await expect(page.locator('.journey-picker, .code-entry')).toHaveCount(0)
})

test('the opening scene supports back/next/skip, locks the board and restores its focus', async ({ page }) => {
  await page.goto('./#/puzzle/south-america-tour-1')
  await expect(page.locator('.story-dialog')).toBeVisible()
  await expect(page.locator('.story-advance')).toBeFocused()
  await expect(page.locator('.story-line')).toContainText('flags are all out of place')
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('.story-line')).toContainText('never pull')
  await page.keyboard.press('ArrowLeft')
  await expect(page.locator('.story-line')).toContainText('flags are all out of place')
  await expect(page.locator('.move-counter b')).toHaveText('0')
  await skipStory(page)
  await expect(page.locator('.board-wrap')).toBeFocused()
  await page.keyboard.press(keys[stories['G2-SA-S1'].solution[0]])
  await expect(page.locator('.move-counter b')).toHaveText('1')
})

test('solving the first puzzle leads to North America, not another South America stop', async ({ page }) => {
  await page.goto('./#/puzzle/south-america-tour-1')
  await skipStory(page)
  for (const direction of stories['G2-SA-S1'].solution) await page.keyboard.press(keys[direction])
  await expect(page.getByRole('button', { name: 'Share your result', exact: true })).toHaveCount(0)
  await expect(page.locator('.story-line')).toContainText('trail goes north')
  await page.locator('.story-skip').click()
  await expect(page.locator('.play-page')).toHaveAttribute('data-code', 'north-america-tour-1')
  await expect(page.locator('.story-dialog')).toBeVisible()
  await expect(page.locator('.journey-hud')).toContainText('World tour 1 of 3')
})

for (const tour of [1, 2]) {
  test(`tour ${tour} ends before the next South America puzzle starts`, async ({ page }) => {
    await page.addInitScript(tour => {
      localStorage.setItem('geosokoban.prototype.v2', JSON.stringify({
        locale: 'en', reduced: true, pendingStory: `oceania-tour-${tour}`
      }))
    }, tour)
    await page.goto(`./#/puzzle/oceania-tour-${tour}`)
    await expect(page.locator('.story-dialog')).toBeVisible()
    await page.locator('.story-skip').click()
    await expect(page.locator('.play-page')).toHaveAttribute('data-code', `south-america-tour-${tour + 1}`)
    await expect(page.locator('.story-dialog')).toBeVisible()
    await expect(page.locator('.story-tour')).toHaveText(`World tour ${tour + 1} of 3`)
  })
}

test('an unread ending survives leaving and reloading; its completion opens one final summary', async ({ page }) => {
  const completed = Array.from({ length: STORY_COUNT }, (_, index) => storyCode(index + 1))
  await page.goto('./')
  await page.evaluate(completed => {
    localStorage.setItem('geosokoban.prototype.v2', JSON.stringify({
      locale: 'en', reduced: true, completed, pendingStory: 'oceania-tour-3'
    }))
  }, completed)
  await page.reload()
  await page.locator('label:has(input[value="story"])').click()
  await page.locator('.start-game').click()
  await expect(page.locator('.story-line')).toContainText('It was me')
  await page.reload()
  await expect(page.locator('.story-line')).toContainText('It was me')
  for (let line = 0; line < 3; line++) await page.locator('.story-advance').click()
  await expect(page.locator('.story-line')).toContainText('with a friend')
  await page.locator('.story-advance').click()
  await expect(page.locator('.result-title')).toHaveText('Journey complete!')
  await page.getByRole('button', { name: 'Return to main menu', exact: true }).click()
  await expect(page.locator('.level-selection')).toBeVisible()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('geosokoban.prototype.v2')).pendingStory)).toBe('')
})

test('hint labels balance their lines and reduced motion disables underlay animations', async ({ page }) => {
  await page.goto('./#/puzzle/south-america-tour-1')
  await skipStory(page)
  await page.locator('.play-controls button').nth(2).click()
  await expect(page.locator('.hint-request')).toHaveCSS('text-wrap-style', 'balance')
  await expect(page.locator('.map-outline')).toHaveCSS('animation-name', 'none')
})
