import { expect, test } from './support/fixtures'

test.describe('User journeys', () => {
  test('serves a response from the origin when using @netlify/remix-adapter', async ({ page, serverlessSite }) => {
    const response = await page.goto(serverlessSite.url)
    await expect(page.getByRole('heading', { name: /Welcome to Remix/i })).toBeVisible()
    expect(response?.headers()['x-nf-function-type']).toBe('request')
  })

  test('serves a response from the edge when using @netlify/remix-edge-adapter', async ({ page, edgeSite }) => {
    const response = await page.goto(edgeSite.url)
    await expect(page.getByRole('heading', { name: /Welcome to Remix/i })).toBeVisible()
    expect(response?.headers()['x-nf-edge-functions']).toBe('server')
  })
})
