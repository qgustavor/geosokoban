import { expect } from '@playwright/test'
import { getStoryScene } from '../../src/content/story-dialogue.js'

/** Existing board tests skip exposition; story-specific tests exercise every dialogue control. */
export async function skipStory (page) {
  const puzzle = page.locator('.play-page')
  await expect(puzzle).toBeVisible()
  await expect(puzzle).toHaveAttribute('aria-busy', 'false')

  const code = await puzzle.getAttribute('data-code')
  if (!getStoryScene(code, 'before', 'en')) return

  await expect(page.locator('.story-dialog')).toBeVisible()

  await page.locator('.story-skip').click()
  await expect(page.locator('.story-dialog')).toHaveCount(0)
}
