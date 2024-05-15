import { expect, test } from './support/fixtures'

test.describe('User journeys', () => {
  test.describe('classic Remix compiler', () => {
    test('serves a response from the origin when using @netlify/remix-adapter', async ({
      page,
      classicServerlessSite,
    }) => {
      const response = await page.goto(classicServerlessSite.url)
      await expect(page.getByRole('heading', { name: /Welcome to Remix/i })).toBeVisible()
      expect(response?.headers()['x-nf-function-type']).toBe('request')
    })

    test('serves a response from the edge when using @netlify/remix-edge-adapter', async ({
      page,
      classicEdgeSite,
    }) => {
      const response = await page.goto(classicEdgeSite.url)
      await expect(page.getByRole('heading', { name: /Welcome to Remix/i })).toBeVisible()
      expect(response?.headers()['x-nf-edge-functions']).toBe('server')
    })
  })
})
