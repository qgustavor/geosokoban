import { test, expect } from '@playwright/test'
import { storyLevel } from '../../src/content/story.js'
import { getStoryScene } from '../../src/content/story-dialogue.js'
import { storyCountryGuide } from '../../src/content/story-guide.js'
import { translate } from '../../src/data/i18n.js'

// Use the real application and workers. Only browser preferences are seeded.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('geosokoban.prototype.v2')) return
    localStorage.setItem('geosokoban.prototype.v2', JSON.stringify({
      locale: 'en', reduced: true, music: false, sfx: false, mode: 'daily', challenge: 'easy'
    }))
  })
})

test('start story, move, undo, restart and undo the restart', async ({ page }) => {
  await page.goto('./#/')
  await page.getByRole('group', { name: 'Game mode', exact: true }).getByText('Story', { exact: true }).click()
  await page.getByRole('button', { name: 'Start the journey', exact: true }).click()
  await page.getByRole('button', { name: 'Skip scene', exact: true }).click()

  const board = page.getByRole('group', { name: 'Puzzle map', exact: true })
  const moves = page.locator('.move-counter b')
  await expect(board).toBeVisible()
  const keys = { up: 'ArrowUp', right: 'ArrowRight', down: 'ArrowDown', left: 'ArrowLeft' }
  const level = storyLevel('south-america-tour-1')
  for (const [index, direction] of level.solution.slice(0, 2).entries()) {
    await board.press(keys[direction])
    await expect(moves).toHaveText(String(index + 1))
  }
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(moves).toHaveText('1')
  await page.getByRole('button', { name: 'Restart', exact: true }).click()
  await expect(moves).toHaveText('0')
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(moves).toHaveText('1')
})

test('solving a story board leads through dialogue to the next chapter', async ({ page }) => {
  await page.goto('./#/puzzle/south-america-tour-1')
  await page.getByRole('button', { name: 'Skip scene', exact: true }).click()
  const board = page.getByRole('group', { name: 'Puzzle map', exact: true })
  const keys = { up: 'ArrowUp', right: 'ArrowRight', down: 'ArrowDown', left: 'ArrowLeft' }
  for (const direction of storyLevel('south-america-tour-1').solution) {
    await board.press(keys[direction])
  }
  const dialogue = page.getByRole('dialog', { name: 'Story scene', exact: true })
  await expect(dialogue).toBeVisible()
  await dialogue.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page).toHaveURL(url => url.hash === '#/puzzle/north-america-tour-1')
  await expect(page.getByRole('button', { name: 'Skip scene', exact: true })).toBeVisible()
})

test('an archived hard puzzle loads through the real worker and survives a reload', async ({ page }) => {
  await page.goto('./#/')
  await page.getByRole('group', { name: 'Game mode', exact: true }).getByText('Past puzzles', { exact: true }).click()
  await page.getByLabel('Puzzle date', { exact: true }).fill('2024-02-29')
  await page.getByRole('group', { name: 'Difficulty', exact: true }).getByText('Hard', { exact: true }).click()
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page).toHaveURL(url => url.hash === '#/puzzle/2024-02-29-hard?g=remember')
  await expect(page.getByRole('group', { name: 'Puzzle map', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('group', { name: 'Puzzle map', exact: true })).toBeVisible()
  await expect(page.locator('.move-counter b')).toHaveText('0')
})

test('the second tour hides destinations on direct links and reloads, with optional country help', async ({ page }) => {
  const level = storyLevel('south-america-tour-2')
  await page.goto(`./#/puzzle/${level.id}?g=learn`)
  await page.getByRole('button', { name: 'Skip scene', exact: true }).click()
  await expect(page.locator('.target')).toHaveCount(0)
  await expect(page.locator('#puzzle-description')).toContainText(translate('en', 'hiddenDestinations'))

  await page.reload()
  await page.getByRole('button', { name: 'Skip scene', exact: true }).click()
  await expect(page.locator('.target')).toHaveCount(0)
  await page.getByRole('button', { name: 'Travel guide', exact: true }).click()
  const guide = page.getByRole('region', { name: 'Travel guide', exact: true })
  const country = level.goals[0].country
  await expect(guide).toContainText(storyCountryGuide(country, 'en'))
  await guide.getByRole('button', { name: 'Reveal destination', exact: true }).click()
  await expect(guide).not.toBeVisible()
  await expect(page.locator('.target')).toHaveCount(1)
  await expect(page.locator('.target')).toHaveAttribute('data-country', country)

  // The next tour restores markers regardless of the incoming menu/query preference.
  const next = storyLevel('south-america-tour-3')
  await page.goto(`./#/puzzle/${next.id}?g=remember`)
  await page.getByRole('button', { name: 'Skip scene', exact: true }).click()
  await expect(page.locator('.target')).toHaveCount(next.goals.length)
})

test('the final delivery reveals Pip, removes the magnet, and preserves an unread ending on reload', async ({ page }) => {
  const level = storyLevel('oceania-tour-3')
  const ending = getStoryScene(level.id, 'after', 'en')
  await page.goto(`./#/puzzle/${level.id}`)
  await expect(page.getByRole('dialog', { name: 'Story scene', exact: true })).toBeVisible()
  await expect(page.locator('.compass-art')).toHaveCount(0)
  await page.getByRole('button', { name: 'Skip scene', exact: true }).click()

  const board = page.getByRole('group', { name: 'Puzzle map', exact: true })
  const keys = { up: 'ArrowUp', right: 'ArrowRight', down: 'ArrowDown', left: 'ArrowLeft' }
  for (const direction of level.solution) await board.press(keys[direction])
  const dialogue = page.getByRole('dialog', { name: 'Story scene', exact: true })
  await expect(dialogue).toContainText(ending.lines[0].text)
  await expect(dialogue.locator('.compass-magnet')).toBeVisible()

  // Reloading a completed board must not lose the friendly reveal.
  await page.reload()
  await expect(dialogue).toContainText(ending.lines[0].text)
  const removal = ending.lines.findIndex(line => line.stage?.pip === 'settling')
  for (let index = 0; index < removal; index++) {
    await dialogue.getByRole('button', { name: 'Next', exact: true }).click()
  }
  await expect(dialogue).toContainText(ending.lines[removal].text)
  await expect(dialogue.locator('.compass-magnet')).toHaveCount(0)
  await dialogue.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(dialogue.locator('.compass-magnet')).toBeVisible()
  for (let index = removal - 1; index < ending.lines.length - 1; index++) {
    await dialogue.getByRole('button', { name: 'Next', exact: true }).click()
  }
  await expect(dialogue.locator('.compass-art')).toHaveAttribute('data-appearance', 'oriented')
  await dialogue.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Journey complete!', exact: true })).toBeVisible()
})
