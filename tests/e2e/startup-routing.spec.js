import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import stories from '../../src/content/story-levels.json' with { type: 'json' }

const mapRequest = /world[^/]*\.gz(?:\?.*)?$/
const compressed = readFileSync(new URL('../../src/data/world.geojson.gz', import.meta.url))
const generated = 'G2-SA-0123456789'
const keys = { up: 'ArrowUp', right: 'ArrowRight', down: 'ArrowDown', left: 'ArrowLeft' }

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('geosokoban.prototype.v2', JSON.stringify({ locale: 'en', reduced: true }))
  })
})

test('menu, options, credits and story do not request the geography asset', async ({ page }) => {
  let requests = 0
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.route(mapRequest, route => {
    requests++; return route.abort()
  })
  await page.goto('./')
  await expect(page.locator('.level-selection')).toBeVisible()
  await page.getByRole('button', { name: 'Options', exact: true }).first().click()
  await expect(page).not.toHaveURL(/#\/options$/)
  await expect(page.locator('.options-page')).toBeVisible()
  await page.locator('.options-page > button').click()
  await page.getByRole('button', { name: 'Credits', exact: true }).first().click()
  await expect(page.locator('.credits-page')).toBeVisible()
  await page.locator('.credits-page > button').click()
  await page.locator('label:has(input[name="game-mode"][value="story"])').click()
  await page.locator('.start-game').click()
  await expect(page.locator('.play-page')).toHaveAttribute('data-code', 'G2-SA-S1')
  await expect(page.locator('.generation-loading')).toHaveCount(0)
  await expect(page.locator('.board-wrap:not(.board-preview) .country-borders path').first()).toBeVisible()
  expect(requests).toBe(0)
  expect(errors).toEqual([])
})

for (const encoding of ['raw-file', 'http-gzip']) {
  test(`a generated deep link loads with ${encoding}`, async ({ page }) => {
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.route(mapRequest, route => route.fulfill({
      status: 200,
      body: compressed,
      headers: encoding === 'http-gzip'
        ? { 'Content-Type': 'application/json', 'Content-Encoding': 'gzip' }
        : { 'Content-Type': 'application/gzip' }
    }))
    await page.goto(`./#/puzzle/${generated}?g=learn`)
    await expect(page.locator('.play-page')).toHaveAttribute('data-code', generated, { timeout: 30000 })
    expect(errors).toEqual([])
    await expect(page.locator('.load-error')).toHaveCount(0)
  })
}

test('the actual server asset opens a generated puzzle without interception', async ({ page }) => {
  await page.goto(`./#/puzzle/${generated}?g=learn`)
  await expect(page.locator('.play-page')).toHaveAttribute('data-code', generated, { timeout: 30000 })
  await expect(page.locator('.load-error')).toHaveCount(0)
})

test('a map failure leaves the menu available and retries without reloading the page', async ({ page }) => {
  let requests = 0
  await page.route(mapRequest, route => ++requests === 1
    ? route.fulfill({ status: 503, body: 'Unavailable' })
    : route.continue())
  await page.goto('./')
  await page.locator('.code-entry summary').click()
  await page.locator('.code-entry input').fill(generated)
  await page.locator('.code-entry button').click()
  await expect(page.locator('.load-error')).toContainText('The map could not load.')
  await expect(page.locator('.level-selection')).toBeVisible()
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(page.locator('.play-page')).toHaveAttribute('data-code', generated, { timeout: 30000 })
  expect(requests).toBe(2)
})

test('refresh uses a hash route and in-game options do not navigate or lose an undo stack', async ({ page }) => {
  await page.goto('./#/puzzle/G2-SA-S2?g=remember')
  await expect(page.locator('.target-flag')).toHaveCount(0)
  await page.reload()
  await expect(page.locator('.play-page')).toHaveAttribute('data-code', 'G2-SA-S2')
  await page.locator('.board-wrap').focus()
  await page.keyboard.press(keys[stories['G2-SA-S2'].solution[0]])
  await expect(page.locator('.move-counter b')).toHaveText('1')
  await page.getByRole('button', { name: 'Menu', exact: true }).click()
  await page.getByRole('button', { name: 'Options', exact: true }).first().click()
  await expect(page).not.toHaveURL(/#\/options$/)
  await expect(page).toHaveURL(/#\/puzzle\/G2-SA-S2\?g=remember$/)
  await expect(page.locator('.move-counter b')).toHaveText('1')
  await expect(page.locator('.options-page')).toBeVisible()
  await page.locator('.options-page > button').click()
  await page.locator('.pause-actions .primary').click()
  await expect(page.locator('.move-counter b')).toHaveText('1')
  await page.locator('.board-wrap').focus()
  await page.keyboard.press('z')
  await expect(page.locator('.move-counter b')).toHaveText('0')
})

test('unknown routes and invalid puzzle codes do not request a map', async ({ page }) => {
  let requests = 0
  await page.route(mapRequest, route => {
    requests++; return route.abort()
  })
  await page.goto('./#/missing')
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
  await page.goto('./#/puzzle/not-a-code')
  await expect(page.locator('.load-error')).toContainText('That code is not recognized.')
  expect(requests).toBe(0)
})

for (const code of ['G2-SA-S1', 'G2-NA-S1', 'G2-NA-S3', 'G2-EE-S1', 'G2-WE-S1', 'G2-AF-S1', 'G2-AS-S1', 'G2-OC-S1']) {
  for (const suffix of ['', '-P']) {
    test(`fresh story ${code}${suffix} renders country outlines without loading geography`, async ({ page }) => {
      const errors = []
      let requests = 0
      page.on('pageerror', error => errors.push(error.message))
      await page.route(mapRequest, route => {
        requests++; return route.abort()
      })
      await page.goto(`./#/puzzle/${code}${suffix}?g=learn`)
      await expect(page.locator('.play-page')).toHaveAttribute('data-code', code + suffix)
      await expect(page.locator('.board-wrap:not(.board-preview) .country-borders path').first()).toBeVisible()
      await expect(page.locator('.map-outline path').first()).toHaveAttribute('d', /^M/)
      await expect(page.locator('.generation-loading')).toHaveCount(0)
      await expect(page.locator('.load-error')).toHaveCount(0)
      expect(requests).toBe(0)
      expect(errors).toEqual([])
    })
  }
}

for (const locale of ['en', 'pt-BR', 'es']) {
  test(`fresh ${locale} menu renders its mode and difficulty choices with a blocked map`, async ({ page }) => {
    const errors = []
    let requests = 0
    page.on('pageerror', error => errors.push(error.message))
    await page.addInitScript(locale => {
      localStorage.setItem('geosokoban.prototype.v2', JSON.stringify({ locale, reduced: true }))
    }, locale)
    await page.route(mapRequest, route => {
      requests++; return route.abort()
    })
    await page.goto('./')
    await expect(page.locator('.level-selection')).toBeVisible()
    await expect(page.locator('.challenge-card')).toHaveCount(3)
    await expect(page.locator('.mode-card')).toHaveCount(3)
    await expect(page.locator('.generation-loading')).toHaveCount(0)
    expect(requests).toBe(0)
    expect(errors).toEqual([])
  })
}
