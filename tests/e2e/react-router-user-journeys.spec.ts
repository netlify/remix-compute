import { expect, test } from './support/fixtures'

const REVALIDATE_BUFFER_MS = 5000
const PURGE_BUFFER_MS = 5000
const CACHE_STATUS_SERVED_FROM_EDGE = /^"Netlify Edge"; (hit|miss)$/

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

    test('serves a response from the CDN (without compute) for a client asset', async ({
      page,
      reactRouterServerlessSite,
    }) => {
      await page.goto(reactRouterServerlessSite.url)
      const logoImg = page.locator('img[src*="logo-dark"]').first()
      const src = await logoImg.getAttribute('src')
      expect(src).toBeTruthy()

      const logoUrl = new URL(src!, reactRouterServerlessSite.url).toString()
      const response = await page.goto(logoUrl)
      expect(response?.status()).toBe(200)
      expect(response?.headers()['cache-status']).toMatch(CACHE_STATUS_SERVED_FROM_EDGE)
    })

    // TODO(serhalp) Revisit this if RR team changes their minds:
    // https://github.com/remix-run/react-router/issues/13226#issuecomment-2776672461.
    test.fail(
      'serves a response from the CDN (without compute) for a pre-rendered route',
      async ({ page, reactRouterServerlessSite }) => {
        const response = await page.goto(`${reactRouterServerlessSite.url}/prerendered`)
        expect(response?.status()).toBe(200)
        await expect(page.getByRole('heading', { name: /Prerendered Page/i })).toBeVisible()
        expect(response?.headers()['cache-status']).toMatch(CACHE_STATUS_SERVED_FROM_EDGE)
      },
    )

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
      reactRouterServerlessWithV8Middleware,
    }) => {
      const response = await page.goto(`${reactRouterServerlessWithV8Middleware.url}/context`)
      expect(response?.status()).toBe(200)
      await expect(page.getByText('This site name is remix-compute-e2e-tests')).toBeVisible()
    })

    test('can access Netlify Functions context in v8 middleware context', async ({
      page,
      reactRouterServerlessWithV8Middleware,
    }) => {
      const response = await page.goto(`${reactRouterServerlessWithV8Middleware.url}/middleware`)
      expect(response?.status()).toBe(200)
      expect(response?.headers()['x-test-site-name']).toBe('remix-compute-e2e-tests')
    })

    test('response has user-defined Cache-Control header', async ({ page, reactRouterServerlessSite }) => {
      const response = await page.goto(`${reactRouterServerlessSite.url}/headers`)
      await expect(page.getByRole('heading', { name: /Headers/i })).toBeVisible()
      expect(response?.headers()['cache-control']).toBe('public,max-age=3600,durable')
    })

    test('user can configure Stale-while-revalidate', async ({ page, reactRouterServerlessSite }) => {
      const MAX_AGE = 60000 // Must match the max-age set in the fixture

      await page.goto(`${reactRouterServerlessSite.url}/stale-while-revalidate`)
      const responseGeneratedAtText1 = await page.getByText('Response generated at').textContent()

      await page.waitForTimeout(MAX_AGE / 2)

      await page.reload()
      const responseGeneratedAtText2 = await page.getByText('Response generated at').textContent()
      expect(responseGeneratedAtText2, 'First and second response should have matching date and time').toEqual(
        responseGeneratedAtText1,
      )

      await page.waitForTimeout(2000 + MAX_AGE / 2)

      await page.reload()
      const responseGeneratedAtText3 = await page.getByText('Response generated at').textContent()
      expect(responseGeneratedAtText3, 'First and third response should have matching date and time').toEqual(
        responseGeneratedAtText1,
      )

      await page.waitForTimeout(REVALIDATE_BUFFER_MS)

      await page.reload()
      const responseGeneratedAtText4 = await page.getByText('Response generated at').textContent()
      expect(
        responseGeneratedAtText4,
        'Fourth response should not have matching date and time with previous responses',
      ).not.toEqual(responseGeneratedAtText1)
    })

    test('user can on-demand purge response cached on CDN', async ({ page, reactRouterServerlessSite }) => {
      await page.goto(`${reactRouterServerlessSite.url}/cached-for-a-year`)
      const responseGeneratedAtText1 = await page.getByText('Response generated at').textContent()

      await page.waitForTimeout(5000)

      await page.reload()
      const responseGeneratedAtText2 = await page.getByText('Response generated at').textContent()
      expect(responseGeneratedAtText2, 'First and second response should have matching date and time').toEqual(
        responseGeneratedAtText1,
      )

      await fetch(`${reactRouterServerlessSite.url}/purge-cdn?tag=cached-for-a-year-tag`)

      await page.waitForTimeout(PURGE_BUFFER_MS)

      await page.reload()
      const responseGeneratedAtText3 = await page.getByText('Response generated at').textContent()
      expect(
        responseGeneratedAtText3,
        'Third response should not have matching date and time with previous responses',
      ).not.toEqual(responseGeneratedAtText1)
    })

    test('Netlify Edge Middleware can add response headers', async ({ page, reactRouterServerlessSite }) => {
      const response = await page.goto(`${reactRouterServerlessSite.url}/middleware-header`)
      expect(response?.status()).toBe(200)
      expect(response?.headers()['foo']).toBe('bar')
    })
  })

  test.describe('edge SSR', () => {
    test('serves a response from the edge', async ({ page, reactRouterEdgeSite }) => {
      const response = await page.goto(reactRouterEdgeSite.url)
      expect(response?.status()).toBe(200)
      await expect(page.getByRole('heading', { name: /Welcome to React Router/i })).toBeVisible()
      expect(response?.headers()['debug-x-nf-edge-functions']).toBe('react-router-server')
    })

    test('serves a 404 for a request to a URL matching no routes', async ({ page, reactRouterEdgeSite }) => {
      const response = await page.goto(`${reactRouterEdgeSite.url}/not-a-real-path`)
      expect(response?.status()).toBe(404)
      // NOT the Netlify default 404 page - actually served by React Router
      await expect(page.getByRole('heading', { name: /404/ })).toBeVisible()
    })

    test('serves a response from the CDN (without compute) for a client asset', async ({
      page,
      reactRouterEdgeSite,
    }) => {
      await page.goto(reactRouterEdgeSite.url)
      const logoImg = page.locator('img[src*="logo-dark"]').first()
      const src = await logoImg.getAttribute('src')
      expect(src).toBeTruthy()

      const logoUrl = new URL(src!, reactRouterEdgeSite.url).toString()
      const response = await page.goto(logoUrl)
      expect(response?.status()).toBe(200)
      expect(response?.headers()['cache-status']).toMatch(CACHE_STATUS_SERVED_FROM_EDGE)
    })

    // TODO(serhalp) Revisit this if RR team changes their minds:
    // https://github.com/remix-run/react-router/issues/13226#issuecomment-2776672461.
    test.fail(
      'serves a response from the CDN (without compute) for a pre-rendered route',
      async ({ page, reactRouterEdgeSite }) => {
        const response = await page.goto(`${reactRouterEdgeSite.url}/prerendered`)
        expect(response?.status()).toBe(200)
        await expect(page.getByRole('heading', { name: /Prerendered Page/i })).toBeVisible()
        expect(response?.headers()['cache-status']).toMatch(CACHE_STATUS_SERVED_FROM_EDGE)
      },
    )

    test('serves a response from a user-defined Netlify Function on a custom path', async ({
      page,
      reactRouterEdgeSite,
    }) => {
      const response = await page.goto(`${reactRouterEdgeSite.url}/please-blorble`)
      expect(response?.status()).toBe(200)
      await expect(page.getByText('gurble')).toBeVisible()
    })

    test('serves a response from a user-defined Netlify Edge Function on a custom path', async ({
      page,
      reactRouterEdgeSite,
    }) => {
      const response = await page.goto(`${reactRouterEdgeSite.url}/ping`)
      expect(response?.status()).toBe(200)
      await expect(page.getByText('Pong!')).toBeVisible()
    })

    test('streams a response from the edge as it is rendered and renders postponed nodes afterward', async ({
      page,
      reactRouterEdgeSite,
    }) => {
      const response = await page.goto(`${reactRouterEdgeSite.url}/about`)
      expect(response?.status()).toBe(200)
      await expect(page.getByRole('heading', { name: /About/i })).toBeVisible()
      // This page has an artificial 2s delay on the server
      await expect(page.getByText('This is an about page streamed from the server.')).toBeVisible({
        timeout: 3000,
      })
    })

    test('can use Netlify Blobs in Remix loaders', async ({ page, reactRouterEdgeSite }) => {
      const response = await page.goto(`${reactRouterEdgeSite.url}/blobs`)
      expect(response?.status()).toBe(200)
      await expect(page.getByRole('heading', { name: /Netlify Blobs/i })).toBeVisible()
      await expect(page.getByText('My favorite breakfast cereal is Raisin Bran')).toBeVisible()
    })

    test('can use the Netlify Image CDN with manually constructed URLs', async ({ page, reactRouterEdgeSite }) => {
      const response = await page.goto(`${reactRouterEdgeSite.url}/images`)
      expect(response?.status()).toBe(200)
      await expect(page.getByRole('heading', { name: /Netlify Image CDN/i })).toBeVisible()
      await expect(page.getByRole('img')).toBeVisible()
      // We've dynamically requested these dimensions from the Image CDN, so this proves that it works
      await expect(page.getByRole('img')).toHaveJSProperty('width', 300)
      await expect(page.getByRole('img')).toHaveJSProperty('height', 300)
    })

    test('can access Netlify Edge Functions context in loader context', async ({ page, reactRouterEdgeSite }) => {
      const response = await page.goto(`${reactRouterEdgeSite.url}/context`)
      expect(response?.status()).toBe(200)
      await expect(page.getByText('This site name is remix-compute-e2e-tests')).toBeVisible()
    })

    test('can access Netlify Functions context in loader context when opted in to v8 middleware flag', async ({
      page,
      reactRouterEdgeWithV8Middleware,
    }) => {
      const response = await page.goto(`${reactRouterEdgeWithV8Middleware.url}/context`)
      expect(response?.status()).toBe(200)
      await expect(page.getByText('This site name is remix-compute-e2e-tests')).toBeVisible()
    })

    test('can access Netlify Functions context in v8 middleware context', async ({
      page,
      reactRouterEdgeWithV8Middleware,
    }) => {
      const response = await page.goto(`${reactRouterEdgeWithV8Middleware.url}/middleware`)
      expect(response?.status()).toBe(200)
      expect(response?.headers()['x-test-site-name']).toBe('remix-compute-e2e-tests')
    })

    test('response has user-defined Cache-Control header', async ({ page, reactRouterEdgeSite }) => {
      const response = await page.goto(`${reactRouterEdgeSite.url}/headers`)
      await expect(page.getByRole('heading', { name: /Headers/i })).toBeVisible()
      expect(response?.headers()['cache-control']).toBe('public,max-age=3600')
    })

    test('user can configure Stale-while-revalidate', async ({ page, reactRouterEdgeSite }) => {
      const MAX_AGE = 60000 // Must match the max-age set in the fixture

      await page.goto(`${reactRouterEdgeSite.url}/stale-while-revalidate`)
      const responseGeneratedAtText1 = await page.getByText('Response generated at').textContent()

      await page.waitForTimeout(MAX_AGE / 2)

      await page.reload()
      const responseGeneratedAtText2 = await page.getByText('Response generated at').textContent()
      expect(responseGeneratedAtText2, 'First and second response should have matching date and time').toEqual(
        responseGeneratedAtText1,
      )

      await page.waitForTimeout(2000 + MAX_AGE / 2)

      await page.reload()
      const responseGeneratedAtText3 = await page.getByText('Response generated at').textContent()
      expect(responseGeneratedAtText3, 'First and third response should have matching date and time').toEqual(
        responseGeneratedAtText1,
      )

      await page.waitForTimeout(REVALIDATE_BUFFER_MS)

      await page.reload()
      const responseGeneratedAtText4 = await page.getByText('Response generated at').textContent()
      expect(
        responseGeneratedAtText4,
        'Fourth response should not have matching date and time with previous responses',
      ).not.toEqual(responseGeneratedAtText1)
    })

    test('user can on-demand purge response cached on CDN', async ({ page, reactRouterEdgeSite }) => {
      await page.goto(`${reactRouterEdgeSite.url}/cached-for-a-year`)
      const responseGeneratedAtText1 = await page.getByText('Response generated at').textContent()

      await page.waitForTimeout(5000)

      await page.reload()
      const responseGeneratedAtText2 = await page.getByText('Response generated at').textContent()
      expect(responseGeneratedAtText2, 'First and second response should have matching date and time').toEqual(
        responseGeneratedAtText1,
      )

      await fetch(`${reactRouterEdgeSite.url}/purge-cdn?tag=cached-for-a-year-tag`)

      await page.waitForTimeout(PURGE_BUFFER_MS)

      await page.reload()
      const responseGeneratedAtText3 = await page.getByText('Response generated at').textContent()
      expect(
        responseGeneratedAtText3,
        'Third response should not have matching date and time with previous responses',
      ).not.toEqual(responseGeneratedAtText1)
    })

    test('Netlify Edge Middleware can add response headers', async ({ page, reactRouterEdgeSite }) => {
      const response = await page.goto(`${reactRouterEdgeSite.url}/middleware-header`)
      expect(response?.status()).toBe(200)
      expect(response?.headers()['foo']).toBe('bar')
    })
  })
})
