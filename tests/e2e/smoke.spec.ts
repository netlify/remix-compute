import { test, expect } from '@playwright/test'

test.describe('Smoke Test', () => {
  test('Should load the demo site', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /Welcome to Remix/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /15m Quickstart Blog Tutorial/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Deep Dive Jokes App Tutorial/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Remix Docs/i })).toBeVisible()
  })

  test('Should load the about route', async ({ page }) => {
    await page.goto('/about')
    await expect(page.getByRole('heading', { name: /About/i })).toBeVisible()
  })
})
