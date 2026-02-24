import { expect, test } from './support/fixtures'

const CACHE_STORE_DELAY_BUFFER_MS = 5000

test.describe('Remix user journeys', () => {
  test('serves a response from the origin when using @netlify/remix-adapter', async ({ page, serverlessSite }) => {
    const response = await page.goto(serverlessSite.url)
    await expect(page.getByRole('heading', { name: /Welcome to Remix/i })).toBeVisible()
    expect(response?.status()).toBe(200)
    expect(response?.headers()['debug-x-nf-function-type']).toBe('request')
  })

  test('serves a response from the edge when using @netlify/remix-edge-adapter', async ({ page, edgeSite }) => {
    const response = await page.goto(edgeSite.url)
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { name: /Welcome to Remix/i })).toBeVisible()
    expect(response?.headers()['debug-x-nf-edge-functions']).toBe('remix-server')
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

  // FIXME(serhalp): This doesn't actually work. Fixing in a stacked PR.
  test.skip('serves a response from a user-defined Netlify Function on a custom path when using edge SSR', async ({
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

  test('can access Netlify Functions context in loader context', async ({ page, serverlessSite }) => {
    const response = await page.goto(`${serverlessSite.url}/context`)
    expect(response?.status()).toBe(200)
    await expect(page.getByText('This site name is remix-compute-e2e-tests')).toBeVisible()
  })

  test('can access Netlify Edge Functions context in loader context', async ({ page, edgeSite }) => {
    const response = await page.goto(`${edgeSite.url}/context`)
    expect(response?.status()).toBe(200)
    await expect(page.getByText('This site name is remix-compute-e2e-tests')).toBeVisible()
  })

  test.describe('Hydrogen Vite site', () => {
    test('serves a response from the edge when using @netlify/remix-edge-adapter and a root `server.ts`', async ({
      page,
      hydrogenViteSite,
    }) => {
      const response = await page.goto(hydrogenViteSite.url)
      expect(response?.status()).toBe(200)
      await expect(page.getByText('Mock.shop')).toBeVisible()
      await expect(page.getByText('Recommended Products')).toBeVisible()
      expect(response?.headers()['debug-x-nf-edge-functions']).toBe('remix-server')
    })

    test('fails the build with an actionable message if the site is missing a root `server.ts` or similar', async ({
      hydrogenViteSiteNoEntrypoint,
    }) => {
      expect(hydrogenViteSiteNoEntrypoint).toBeInstanceOf(Error)
      expect(hydrogenViteSiteNoEntrypoint?.message).toMatch(/Your Hydrogen site must include a `server.ts`/)
    })
  })

  test('response has user-defined Cache-Control header when using origin SSR', async ({ page, serverlessSite }) => {
    const response = await page.goto(`${serverlessSite.url}/headers`)
    await expect(page.getByRole('heading', { name: /Headers/i })).toBeVisible()
    expect(response?.headers()['cache-control']).toBe('public,max-age=3600,durable')
  })

  test('response has user-defined Cache-Control header when using edge SSR', async ({ page, edgeSite }) => {
    const response = await page.goto(`${edgeSite.url}/headers`)
    await expect(page.getByRole('heading', { name: /Headers/i })).toBeVisible()
    expect(response?.headers()['cache-control']).toBe('public,max-age=3600')
  })

  test('can cache function responses on CDN', async ({ page, serverlessSite }) => {
    const ssrResponse = await page.goto(`${serverlessSite.url}/cacheable`)
    expect(ssrResponse?.status()).toBe(200)
    expect(ssrResponse?.headers()['cdn-cache-control']).toBe('public, max-age=60, durable')

    await page.waitForTimeout(CACHE_STORE_DELAY_BUFFER_MS)

    const cachedResponse = await page.reload()
    expect(cachedResponse?.status()).toBe(200)
    expect(cachedResponse?.headers()['cdn-cache-control']).toBe('public, max-age=60, durable')
    // Page includes `Date.now()` so it can only have the same etag if it's the previously cached response
    expect(cachedResponse?.headers()['debug-x-nf-gen-etag']).toBe(ssrResponse?.headers()['debug-x-nf-gen-etag'])
  })

  test('can cache edge function responses on CDN when using edge SSR', async ({ page, edgeSite }) => {
    const ssrResponse = await page.goto(`${edgeSite.url}/cacheable`)
    expect(ssrResponse?.status()).toBe(200)
    expect(ssrResponse?.headers()['cdn-cache-control']).toBe('public, max-age=60')

    await page.waitForTimeout(CACHE_STORE_DELAY_BUFFER_MS)

    const cachedResponse = await page.reload()
    expect(cachedResponse?.status()).toBe(200)
    expect(cachedResponse?.headers()['cdn-cache-control']).toBe('public, max-age=60')
    // Page includes `Date.now()` so it can only have the same etag if it's the previously cached response
    expect(cachedResponse?.headers()['debug-x-nf-gen-etag']).toBe(ssrResponse?.headers()['debug-x-nf-gen-etag'])
  })

  test('Netlify Edge Middleware can add response headers when using origin SSR', async ({ page, serverlessSite }) => {
    const response = await page.goto(`${serverlessSite.url}/middleware-header`)
    expect(response?.status()).toBe(200)
    expect(response?.headers()['foo']).toBe('bar')
  })

  test('Netlify Edge Middleware can add response headers when using edge SSR', async ({ page, edgeSite }) => {
    const response = await page.goto(`${edgeSite.url}/middleware-header`)
    expect(response?.status()).toBe(200)
    expect(response?.headers()['foo']).toBe('bar')
  })
})
