import { test, expect } from '@playwright/test'
import stories from '../../src/content/story-levels.json' with { type: 'json' }

const keys = { up: 'ArrowUp', right: 'ArrowRight', down: 'ArrowDown', left: 'ArrowLeft' }

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('geosokoban.prototype.v2', JSON.stringify({ locale: 'en', reduced: true }))
  })
})

async function open (page, code = 'G2-SA-S2', guidance = 'learn') {
  await page.goto(`./#/puzzle/${code}?g=${guidance}`)
  await expect(page.locator('.play-page')).toHaveAttribute('data-code', code)
}

async function options (page) {
  await page.getByRole('button', { name: 'Menu', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Options', exact: true }).click()
  await expect(page.locator('.options-page')).toBeVisible()
}

test('restart resets moves and remains undoable, without direction buttons or a sidebar', async ({ page }) => {
  await open(page)
  await expect(page.locator('.target-flag')).toHaveCount(2)
  await expect(page.locator('.deadlock-warning, .direction-pad, .play-sidebar')).toHaveCount(0)
  await expect(page.locator('.play-controls button')).toHaveCount(4)
  await page.locator('.board-wrap').focus()
  await page.keyboard.press(keys[stories['G2-SA-S2'].solution[0]])
  await expect(page.locator('.move-counter b')).toHaveText('1')
  await page.keyboard.press('r')
  await expect(page.locator('.move-counter b')).toHaveText('0')
  await page.keyboard.press('z')
  await expect(page.locator('.move-counter b')).toHaveText('1')
  await page.keyboard.press('z')
  await expect(page.locator('.move-counter b')).toHaveText('0')
})

test('hints progress only on request, at least ten seconds apart', async ({ page }) => {
  await page.clock.install()
  await open(page)
  await expect(page.locator('.hint-overlay')).toHaveCount(0)
  await page.locator('.play-controls button').nth(2).click()
  await expect(page.locator('.hint-box')).toHaveCount(1)
  await expect(page.locator('.hint-route')).toHaveCount(0)
  await expect(page.locator('.hint-request')).toBeDisabled()
  await expect(page.locator('.hint-request')).toContainText('Next hint in')
  await page.clock.runFor(10000)
  await expect(page.locator('.push-marker')).toHaveCount(0)
  await page.getByRole('button', { name: 'More help', exact: true }).click()
  await expect(page.locator('.push-marker').first()).toBeVisible()
  await expect(page.locator('.hint-request')).toBeDisabled()
  await page.clock.runFor(10000)
  await expect(page.locator('.hint-route')).toHaveCount(0)
  await page.getByRole('button', { name: 'More help', exact: true }).click()
  await expect(page.locator('.hint-route')).toHaveCount(1)
})

test('unknown destinations show question marks and reveal only on request', async ({ page }) => {
  await open(page, 'G2-SA-S2', 'remember')
  await expect(page.locator('.target-flag')).toHaveCount(0)
  await expect(page.locator('.goal-number')).toHaveText(['?', '?'])
  await page.locator('.target').first().click()
  await page.locator('.geography-popover button').click()
  await expect(page.locator('.target-flag')).toHaveCount(1)
})

test('a swipe moves in the requested direction without also inspecting a flag', async ({ page }) => {
  await open(page)
  const direction = stories['G2-SA-S2'].solution[0]
  const [dx, dy] = { up: [0, -32], right: [32, 0], down: [0, 32], left: [-32, 0] }[direction]
  const board = page.locator('.board-wrap')
  const point = { pointerId: 1, pointerType: 'touch', isPrimary: true, button: 0, clientX: 140, clientY: 240 }
  await board.dispatchEvent('pointerdown', point)
  await board.dispatchEvent('pointerup', { ...point, clientX: point.clientX + dx, clientY: point.clientY + dy })
  await expect(page.locator('.move-counter b')).toHaveText('1')
  await expect(page.locator('.player-actor .globe-art')).toHaveAttribute('data-facing', direction)
  await expect(page.locator('.geography-popover')).toHaveCount(0)
})

test('delivery labels precede clear and results; share falls back visibly without an undo action', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
  })
  await open(page, 'G2-SA-S1')
  await page.locator('.board-wrap').focus()
  for (const direction of stories['G2-SA-S1'].solution) await page.keyboard.press(keys[direction])
  await expect(page.locator('.flag-label')).toBeVisible()
  await expect(page.locator('.game-dialog')).toHaveCount(0)
  await expect(page.locator('.clear-announcement')).toBeVisible()
  await expect(page.locator('.game-dialog')).toBeVisible()
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Undo', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Share your result', exact: true }).click()
  await expect(page.locator('.share-text')).toHaveValue(/#/)
  await page.getByRole('button', { name: 'Close', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Return to main menu', exact: true }).click()
  await expect(page.locator('.level-selection')).toBeVisible()
})

test('three difficulty choices set target visibility and the layout variant', async ({ page }) => {
  for (const [choice, planning, recall] of [['easy', false, false], ['medium', false, true], ['hard', true, true]]) {
    await page.goto('./')
    await expect(page.locator('input[name="challenge"]')).toHaveCount(3)
    await expect(page.locator('input[name="game-mode"][value="daily"]')).toBeChecked()
    await page.locator('label:has(input[name="game-mode"][value="story"])').click()
    await page.locator(`label:has(input[name="challenge"][value="${choice}"])`).click()
    await page.locator('.start-game').click()
    await expect(page.locator('.play-page')).toHaveAttribute('data-code', `G2-SA-S1${planning ? '-P' : ''}`)
    await expect(page.locator('.target-flag')).toHaveCount(recall ? 0 : 1)
    await expect(page.locator('.box-actor')).toHaveCount(planning ? 3 : 1)
  }
})

test('options and language changes preserve the current board and undo history', async ({ page }) => {
  await open(page)
  await page.locator('.board-wrap').focus()
  await page.keyboard.press(keys[stories['G2-SA-S2'].solution[0]])
  const url = page.url()
  await options(page)
  expect(page.url()).toBe(url)
  await page.locator('.options-page select').selectOption('pt-BR')
  await page.locator('.options-page > button').click()
  await page.locator('.pause-actions .primary').click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR')
  await expect(page.locator('.move-counter b')).toHaveText('1')
  await page.locator('.board-wrap').focus()
  await page.keyboard.press('z')
  await expect(page.locator('.move-counter b')).toHaveText('0')
})

for (const locale of ['en', 'pt-BR', 'es']) {
  test(`${locale} selection and play fit the viewport`, async ({ page }) => {
    await page.goto('./')
    await page.locator('.language-picker select').selectOption(locale)
    await expect(page.locator('.mode-card')).toHaveCount(3)
    await expect(page.locator('.challenge-card')).toHaveCount(3)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.locator('label:has(input[name="game-mode"][value="story"])').click()
    await page.locator('.start-game').click()
    await expect(page.locator('.play-page')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}


test('subtle continuous tiles retain coastlines, target contrast and a diagonal reveal', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('geosokoban.prototype.v2', JSON.stringify({ locale: 'en', reduced: false }))
  })
  await open(page)
  const style = await page.locator('.tile-surface').first().evaluate(element => ({
    opacity: getComputedStyle(element).strokeOpacity,
    width: element.getAttribute('width'),
    rx: element.getAttribute('rx')
  }))
  expect(Number(style.opacity)).toBeLessThan(.2)
  expect(style.width).toBe('40')
  expect(style.rx).toBeNull()
  await expect(page.locator('.coast-edge[d^="M"]').first()).toHaveAttribute('d', /M/)
  const delays = await page.locator('.land-tile').evaluateAll(elements => {
    return elements.map(element => parseFloat(element.style.animationDelay))
  })
  expect(Math.max(...delays)).toBeGreaterThan(Math.min(...delays))
  await expect(page.locator('.selected-country, .selected-outline')).toHaveCount(0)
  const icons = await page.locator('.hud-button').evaluateAll(buttons => buttons.map(button => {
    const buttonBounds = button.getBoundingClientRect()
    const iconBounds = button.querySelector('svg').getBoundingClientRect()

    // Compare visual centers in screen coordinates, not CSS offsets within the button.
    const dx = Math.abs(buttonBounds.x + buttonBounds.width / 2 - iconBounds.x - iconBounds.width / 2)
    const dy = Math.abs(buttonBounds.y + buttonBounds.height / 2 - iconBounds.y - iconBounds.height / 2)
    return { dx, dy }
  }))
  expect(icons.every(icon => icon.dx < 1 && icon.dy < 1)).toBe(true)
})

test('hiding hints and restarting cannot bypass the request cooldown', async ({ page }) => {
  await page.clock.install()
  await open(page)
  await page.locator('.play-controls button').nth(2).click()
  await expect(page.locator('.hint-box')).toHaveCount(1)
  await page.locator('.hint-actions .secondary').click()
  await page.getByRole('button', { name: 'Restart', exact: true }).click()
  await page.locator('.play-controls button').nth(2).click()
  await expect(page.locator('.hint-request')).toBeDisabled()
  await expect(page.locator('.hint-box')).toHaveCount(0)
  await page.clock.runFor(10000)
  await expect(page.locator('.hint-request')).toBeEnabled()
  await expect(page.locator('.hint-box')).toHaveCount(0)
  await page.locator('.hint-request').click()
  await expect(page.locator('.hint-box')).toHaveCount(1)
})
