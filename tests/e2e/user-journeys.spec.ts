import { expect, test } from './support/fixtures'

test.describe('User journeys', () => {
  test('serves a response from the origin when using @netlify/remix-adapter', async ({ page, serverlessSite }) => {
    const response = await page.goto(serverlessSite.url)
    await expect(page.getByRole('heading', { name: /Welcome to Remix/i })).toBeVisible()
    expect(response?.status()).toBe(200)
    expect(response?.headers()['x-nf-function-type']).toBe('request')
  })

  test('serves a response from the edge when using @netlify/remix-edge-adapter', async ({ page, edgeSite }) => {
    const response = await page.goto(edgeSite.url)
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { name: /Welcome to Remix/i })).toBeVisible()
    expect(response?.headers()['x-nf-edge-functions']).toBe('remix-server')
  })

  test('serves a 404 for a request to a URL matching no routes', async ({ page, serverlessSite }) => {
    const response = await page.goto(`${serverlessSite.url}/not-a-real-path`)
    expect(response?.status()).toBe(404)
    await expect(page.getByRole('heading', { name: /404 Not Found/i })).toBeVisible()
  })

  test('serves a response from a user-defined Netlify Function on a custom path when using origin SSR', async ({
    page,
    serverlessSite,
  }) => {
    const response = await page.goto(`${serverlessSite.url}/please-blorble`)
    expect(response?.status()).toBe(200)
    await expect(page.getByText('gurble')).toBeVisible()
  })

  test('serves a response from a user-defined Netlify Function on a custom path when using edge SSR', async ({
    page,
    edgeSite,
  }) => {
    const response = await page.goto(`${edgeSite.url}/please-blorble`)
    expect(response?.status()).toBe(200)
    await expect(page.getByText('gurble')).toBeVisible()
  })

  test('serves a response from a user-defined Netlify Edge Function on a custom path when using origin SSR', async ({
    page,
    serverlessSite,
  }) => {
    const response = await page.goto(`${serverlessSite.url}/ping`)
    expect(response?.status()).toBe(200)
    await expect(page.getByText('Pong!')).toBeVisible()
  })

  test('serves a response from a user-defined Netlify Edge Function on a custom path when using edge SSR', async ({
    page,
    edgeSite,
  }) => {
    const response = await page.goto(`${edgeSite.url}/ping`)
    expect(response?.status()).toBe(200)
    await expect(page.getByText('Pong!')).toBeVisible()
  })

  test('streams a response from the origin as it is rendered and renders postponed nodes afterward', async ({
    page,
    serverlessSite,
  }) => {
    const response = await page.goto(`${serverlessSite.url}/about`)
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { name: /About/i })).toBeVisible()
    // This page has an artificial 2s delay on the server
    await expect(page.getByText('This is an about page streamed from the server.')).toBeVisible({
      timeout: 3000,
    })
  })

  test('streams a response from the edge as it is rendered and renders postponed nodes afterward', async ({
    page,
    edgeSite,
  }) => {
    const response = await page.goto(`${edgeSite.url}/about`)
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { name: /About/i })).toBeVisible()
    // This page has an artificial 2s delay on the server
    await expect(page.getByText('This is an about page streamed from the server.')).toBeVisible({
      timeout: 3000,
    })
  })

  test('can use Netlify Blobs in Remix loaders', async ({ page, serverlessSite }) => {
    const response = await page.goto(`${serverlessSite.url}/blobs`)
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { name: /Netlify Blobs/i })).toBeVisible()
    await expect(page.getByText('My favorite breakfast cereal is Raisin Bran')).toBeVisible()
  })

  test('can use the Netlify Image CDN with manually constructed URLs', async ({ page, serverlessSite }) => {
    const response = await page.goto(`${serverlessSite.url}/images`)
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { name: /Netlify Image CDN/i })).toBeVisible()
    await expect(page.getByRole('img')).toBeVisible()
    // We've dynamically requested these dimensions from the Image CDN, so this proves that it works
    await expect(page.getByRole('img')).toHaveJSProperty('width', 300)
    await expect(page.getByRole('img')).toHaveJSProperty('height', 300)
  })

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
