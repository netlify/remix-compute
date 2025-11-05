import { expect, test } from './support/fixtures'

const CACHE_STORE_DELAY_BUFFER_MS = 5000

test.describe('React Router user journeys', () => {
  test.describe('origin SSR', () => {
    test('serves a response from the origin', async ({ page, reactRouterServerlessSite }) => {
      const response = await page.goto(reactRouterServerlessSite.url)
      await expect(page.getByRole('heading', { name: /Welcome to React Router/i })).toBeVisible()
      expect(response?.status()).toBe(200)
      expect(response?.headers()['debug-x-nf-function-type']).toBe('request')
    })

    test('serves a 404 for a request to a URL matching no routes', async ({ page, reactRouterServerlessSite }) => {
      const response = await page.goto(`${reactRouterServerlessSite.url}/not-a-real-path`)
      expect(response?.status()).toBe(404)
      await expect(page.getByRole('heading', { name: /404/ })).toBeVisible()
    })

    test('serves a response from a user-defined Netlify Function on a custom path', async ({
      page,
      reactRouterServerlessSite,
    }) => {
      const response = await page.goto(`${reactRouterServerlessSite.url}/please-blorble`)
      expect(response?.status()).toBe(200)
      await expect(page.getByText('gurble')).toBeVisible()
    })

    test('serves a response from a user-defined Netlify Edge Function on a custom path', async ({
      page,
      reactRouterServerlessSite,
    }) => {
      const response = await page.goto(`${reactRouterServerlessSite.url}/ping`)
      expect(response?.status()).toBe(200)
      await expect(page.getByText('Pong!')).toBeVisible()
    })

    test('streams a response from the origin as it is rendered and renders postponed nodes afterward', async ({
      page,
      reactRouterServerlessSite,
    }) => {
      const response = await page.goto(`${reactRouterServerlessSite.url}/about`)
      expect(response?.status()).toBe(200)
      await expect(page.getByRole('heading', { name: /About/i })).toBeVisible()
      // This page has an artificial 2s delay on the server
      await expect(page.getByText('This is an about page streamed from the server.')).toBeVisible({
        timeout: 3000,
      })
    })

    test('can use Netlify Blobs in Remix loaders', async ({ page, reactRouterServerlessSite }) => {
      const response = await page.goto(`${reactRouterServerlessSite.url}/blobs`)
      expect(response?.status()).toBe(200)
      await expect(page.getByRole('heading', { name: /Netlify Blobs/i })).toBeVisible()
      await expect(page.getByText('My favorite breakfast cereal is Raisin Bran')).toBeVisible()
    })

    test('can use the Netlify Image CDN with manually constructed URLs', async ({
      page,
      reactRouterServerlessSite,
    }) => {
      const response = await page.goto(`${reactRouterServerlessSite.url}/images`)
      expect(response?.status()).toBe(200)
      await expect(page.getByRole('heading', { name: /Netlify Image CDN/i })).toBeVisible()
      await expect(page.getByRole('img')).toBeVisible()
      // We've dynamically requested these dimensions from the Image CDN, so this proves that it works
      await expect(page.getByRole('img')).toHaveJSProperty('width', 300)
      await expect(page.getByRole('img')).toHaveJSProperty('height', 300)
    })

    test('can access Netlify Functions context in loader context', async ({ page, reactRouterServerlessSite }) => {
      const response = await page.goto(`${reactRouterServerlessSite.url}/context`)
      expect(response?.status()).toBe(200)
      await expect(page.getByText('This site name is remix-compute-e2e-tests')).toBeVisible()
    })

    test('can access Netlify Functions context in loader context when opted in to v8 middleware flag', async ({
      page,
      reactRouterWithV8Middleware,
    }) => {
      const response = await page.goto(`${reactRouterWithV8Middleware.url}/context`)
      expect(response?.status()).toBe(200)
      await expect(page.getByText('This site name is remix-compute-e2e-tests')).toBeVisible()
    })

    test('can access Netlify Functions context in v8 middleware context', async ({
      page,
      reactRouterWithV8Middleware,
    }) => {
      const response = await page.goto(`${reactRouterWithV8Middleware.url}/middleware`)
      expect(response?.status()).toBe(200)
      expect(response?.headers()['x-test-site-name']).toBe('remix-compute-e2e-tests')
    })

    test('response has user-defined Cache-Control header', async ({ page, reactRouterServerlessSite }) => {
      const response = await page.goto(`${reactRouterServerlessSite.url}/headers`)
      await expect(page.getByRole('heading', { name: /Headers/i })).toBeVisible()
      expect(response?.headers()['cache-control']).toBe('public,max-age=3600,durable')
    })

    test('can cache function responses on CDN', async ({ page, reactRouterServerlessSite }) => {
      const ssrResponse = await page.goto(`${reactRouterServerlessSite.url}/cacheable`)
      expect(ssrResponse?.status()).toBe(200)
      expect(ssrResponse?.headers()['cdn-cache-control']).toBe('public, max-age=60, durable')

      await page.waitForTimeout(CACHE_STORE_DELAY_BUFFER_MS)

      const cachedResponse = await page.reload()
      expect(cachedResponse?.status()).toBe(200)
      expect(cachedResponse?.headers()['cdn-cache-control']).toBe('public, max-age=60, durable')
      // Page includes `Date.now()` so it can only have the same etag if it's the previously cached response
      expect(cachedResponse?.headers()['debug-x-nf-gen-etag']).toBe(ssrResponse?.headers()['debug-x-nf-gen-etag'])
    })

    test('Netlify Edge Middleware can add response headers', async ({ page, reactRouterServerlessSite }) => {
      const response = await page.goto(`${reactRouterServerlessSite.url}/middleware-header`)
      expect(response?.status()).toBe(200)
      expect(response?.headers()['foo']).toBe('bar')
    })
  })

  // TODO(serhalp) Unskip once we've implemented edge support (FRB-1519)
  test.describe.skip('edge SSR', () => {
    test('serves a response from the edge', async ({ page, edgeSite }) => {
      const response = await page.goto(edgeSite.url)
      expect(response?.status()).toBe(200)
      await expect(page.getByRole('heading', { name: /Welcome to Remix/i })).toBeVisible()
      expect(response?.headers()['debug-x-nf-edge-functions']).toBe('remix-server')
    })

    test('serves a response from a user-defined Netlify Function on a custom path', async ({ page, edgeSite }) => {
      const response = await page.goto(`${edgeSite.url}/please-blorble`)
      expect(response?.status()).toBe(200)
      await expect(page.getByText('gurble')).toBeVisible()
    })

    test('serves a response from a user-defined Netlify Edge Function on a custom path', async ({ page, edgeSite }) => {
      const response = await page.goto(`${edgeSite.url}/ping`)
      expect(response?.status()).toBe(200)
      await expect(page.getByText('Pong!')).toBeVisible()
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

    test('can access Netlify Edge Functions context in loader context', async ({ page, edgeSite }) => {
      const response = await page.goto(`${edgeSite.url}/context`)
      expect(response?.status()).toBe(200)
      await expect(page.getByText('This site name is remix-compute-e2e-tests')).toBeVisible()
    })

    test('response has user-defined Cache-Control header', async ({ page, edgeSite }) => {
      const response = await page.goto(`${edgeSite.url}/headers`)
      await expect(page.getByRole('heading', { name: /Headers/i })).toBeVisible()
      expect(response?.headers()['cache-control']).toBe('public,max-age=3600')
    })

    test('can cache edge function responses on CDN', async ({ page, edgeSite }) => {
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

    test('Netlify Edge Middleware can add response headers', async ({ page, edgeSite }) => {
      const response = await page.goto(`${edgeSite.url}/middleware-header`)
      expect(response?.status()).toBe(200)
      expect(response?.headers()['foo']).toBe('bar')
    })
  })
})
