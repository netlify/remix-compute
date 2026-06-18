import { type Page } from '@playwright/test'

import { type Fixture } from './support/deploy-to-netlify'
import { expect, test } from './support/fixtures'

const CACHE_STORE_DELAY_BUFFER_MS = 5000
const CACHE_STATUS_SERVED_FROM_EDGE = /^"Netlify Edge"; [a-z=]+$/

/** A test body that runs against a deployed site fixture. */
type SiteTest = (page: Page, site: Fixture) => Promise<void>
/** Registers a single test, wiring up the appropriate deployed site fixture. */
type DefineTest = (title: string, body: SiteTest) => void

/**
 * The origin SSR suite. Defined once and run against each supported React Router major version
 * (see below) so we exercise identical behaviour across versions without duplicating assertions.
 */
const defineOriginSsrTests = (defineTest: DefineTest): void => {
  defineTest('serves a response from the origin', async (page, site) => {
    const response = await page.goto(site.url)
    await expect(page.getByRole('heading', { name: /Welcome to React Router/i })).toBeVisible()
    expect(response?.status()).toBe(200)
    expect(response?.headers()['debug-x-nf-function-type']).toBe('request')
  })

  defineTest('serves a 404 for a request to a URL matching no routes', async (page, site) => {
    const response = await page.goto(`${site.url}/not-a-real-path`)
    expect(response?.status()).toBe(404)
    await expect(page.getByRole('heading', { name: /404/ })).toBeVisible()
  })

  defineTest('serves a response from the CDN (without compute) for a client asset', async (page, site) => {
    await page.goto(site.url)
    const logoImg = page.locator('img[src*="logo-dark"]').first()
    const src = await logoImg.getAttribute('src')
    expect(src).toBeTruthy()

    const logoUrl = new URL(src!, site.url).toString()
    const response = await page.goto(logoUrl)
    expect(response?.status()).toBe(200)
    expect(response?.headers()['cache-status']).toMatch(CACHE_STATUS_SERVED_FROM_EDGE)
  })

  defineTest('serves a response from the CDN (without compute) for a pre-rendered route', async (page, site) => {
    const response = await page.goto(`${site.url}/prerendered`)
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { name: /Prerendered Page/i })).toBeVisible()
    expect(response?.headers()['cache-status']).toMatch(CACHE_STATUS_SERVED_FROM_EDGE)
  })

  defineTest('serves a response from a user-defined Netlify Function on a custom path', async (page, site) => {
    const response = await page.goto(`${site.url}/please-blorble`)
    expect(response?.status()).toBe(200)
    await expect(page.getByText('gurble')).toBeVisible()
  })

  defineTest('serves a response from a user-defined Netlify Edge Function on a custom path', async (page, site) => {
    const response = await page.goto(`${site.url}/ping`)
    expect(response?.status()).toBe(200)
    await expect(page.getByText('Pong!')).toBeVisible()
  })

  defineTest(
    'streams a response from the origin as it is rendered and renders postponed nodes afterward',
    async (page, site) => {
      const response = await page.goto(`${site.url}/about`)
      expect(response?.status()).toBe(200)
      await expect(page.getByRole('heading', { name: /About/i })).toBeVisible()
      // This page has an artificial 2s delay on the server
      await expect(page.getByText('This is an about page streamed from the server.')).toBeVisible({
        timeout: 3000,
      })
    },
  )

  defineTest('can use Netlify Blobs in Remix loaders', async (page, site) => {
    const response = await page.goto(`${site.url}/blobs`)
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { name: /Netlify Blobs/i })).toBeVisible()
    await expect(page.getByText('My favorite breakfast cereal is Raisin Bran')).toBeVisible()
  })

  defineTest('can use the Netlify Image CDN with manually constructed URLs', async (page, site) => {
    const response = await page.goto(`${site.url}/images`)
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { name: /Netlify Image CDN/i })).toBeVisible()
    await expect(page.getByRole('img')).toBeVisible()
    // We've dynamically requested these dimensions from the Image CDN, so this proves that it works
    await expect(page.getByRole('img')).toHaveJSProperty('width', 300)
    await expect(page.getByRole('img')).toHaveJSProperty('height', 300)
  })

  defineTest('can access Netlify Functions context in loader context', async (page, site) => {
    const response = await page.goto(`${site.url}/context`)
    expect(response?.status()).toBe(200)
    await expect(page.getByText('This site name is remix-compute-e2e-tests')).toBeVisible()
  })

  defineTest('response has user-defined Cache-Control header', async (page, site) => {
    const response = await page.goto(`${site.url}/headers`)
    await expect(page.getByRole('heading', { name: /Headers/i })).toBeVisible()
    expect(response?.headers()['cache-control']).toBe('public,max-age=3600,durable')
  })

  defineTest('can cache function responses on CDN', async (page, site) => {
    const ssrResponse = await page.goto(`${site.url}/cacheable`)
    expect(ssrResponse?.status()).toBe(200)
    expect(ssrResponse?.headers()['cdn-cache-control']).toBe('public, max-age=60, durable')

    await page.waitForTimeout(CACHE_STORE_DELAY_BUFFER_MS)

    const cachedResponse = await page.reload()
    expect(cachedResponse?.status()).toBe(200)
    expect(cachedResponse?.headers()['cdn-cache-control']).toBe('public, max-age=60, durable')
    // Page includes `Date.now()` so it can only have the same etag if it's the previously cached response
    expect(cachedResponse?.headers()['debug-x-nf-gen-etag']).toBe(ssrResponse?.headers()['debug-x-nf-gen-etag'])
  })

  defineTest('Netlify Edge Middleware can add response headers', async (page, site) => {
    const response = await page.goto(`${site.url}/middleware-header`)
    expect(response?.status()).toBe(200)
    expect(response?.headers()['foo']).toBe('bar')
  })
}

/**
 * The edge SSR suite. Defined once and run against each supported React Router major version.
 */
const defineEdgeSsrTests = (defineTest: DefineTest): void => {
  defineTest('serves a response from the edge', async (page, site) => {
    const response = await page.goto(site.url)
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { name: /Welcome to React Router/i })).toBeVisible()
    expect(response?.headers()['debug-x-nf-edge-functions']).toBe('react-router-server')
  })

  defineTest('serves a 404 for a request to a URL matching no routes', async (page, site) => {
    const response = await page.goto(`${site.url}/not-a-real-path`)
    expect(response?.status()).toBe(404)
    // NOT the Netlify default 404 page - actually served by React Router
    await expect(page.getByRole('heading', { name: /404/ })).toBeVisible()
  })

  defineTest('serves a response from the CDN (without compute) for a client asset', async (page, site) => {
    await page.goto(site.url)
    const logoImg = page.locator('img[src*="logo-dark"]').first()
    const src = await logoImg.getAttribute('src')
    expect(src).toBeTruthy()

    const logoUrl = new URL(src!, site.url).toString()
    const response = await page.goto(logoUrl)
    expect(response?.status()).toBe(200)
    expect(response?.headers()['cache-status']).toMatch(CACHE_STATUS_SERVED_FROM_EDGE)
  })

  defineTest('serves a response from the CDN (without compute) for a pre-rendered route', async (page, site) => {
    const response = await page.goto(`${site.url}/prerendered`)
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { name: /Prerendered Page/i })).toBeVisible()
    expect(response?.headers()['cache-status']).toMatch(CACHE_STATUS_SERVED_FROM_EDGE)
  })

  defineTest('serves a response from a user-defined Netlify Function on a custom path', async (page, site) => {
    const response = await page.goto(`${site.url}/please-blorble`)
    expect(response?.status()).toBe(200)
    await expect(page.getByText('gurble')).toBeVisible()
  })

  defineTest('serves a response from a user-defined Netlify Edge Function on a custom path', async (page, site) => {
    const response = await page.goto(`${site.url}/ping`)
    expect(response?.status()).toBe(200)
    await expect(page.getByText('Pong!')).toBeVisible()
  })

  defineTest(
    'streams a response from the edge as it is rendered and renders postponed nodes afterward',
    async (page, site) => {
      const response = await page.goto(`${site.url}/about`)
      expect(response?.status()).toBe(200)
      await expect(page.getByRole('heading', { name: /About/i })).toBeVisible()
      // This page has an artificial 2s delay on the server
      await expect(page.getByText('This is an about page streamed from the server.')).toBeVisible({
        timeout: 3000,
      })
    },
  )

  defineTest('can use Netlify Blobs in Remix loaders', async (page, site) => {
    const response = await page.goto(`${site.url}/blobs`)
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { name: /Netlify Blobs/i })).toBeVisible()
    await expect(page.getByText('My favorite breakfast cereal is Raisin Bran')).toBeVisible()
  })

  defineTest('can use the Netlify Image CDN with manually constructed URLs', async (page, site) => {
    const response = await page.goto(`${site.url}/images`)
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { name: /Netlify Image CDN/i })).toBeVisible()
    await expect(page.getByRole('img')).toBeVisible()
    // We've dynamically requested these dimensions from the Image CDN, so this proves that it works
    await expect(page.getByRole('img')).toHaveJSProperty('width', 300)
    await expect(page.getByRole('img')).toHaveJSProperty('height', 300)
  })

  defineTest('can access Netlify Edge Functions context in loader context', async (page, site) => {
    const response = await page.goto(`${site.url}/context`)
    expect(response?.status()).toBe(200)
    await expect(page.getByText('This site name is remix-compute-e2e-tests')).toBeVisible()
  })

  defineTest('response has user-defined Cache-Control header', async (page, site) => {
    const response = await page.goto(`${site.url}/headers`)
    await expect(page.getByRole('heading', { name: /Headers/i })).toBeVisible()
    expect(response?.headers()['cache-control']).toBe('public,max-age=3600')
  })

  defineTest('can cache edge function responses on CDN', async (page, site) => {
    const ssrResponse = await page.goto(`${site.url}/cacheable`)
    expect(ssrResponse?.status()).toBe(200)
    expect(ssrResponse?.headers()['cdn-cache-control']).toBe('public, max-age=60')

    await page.waitForTimeout(CACHE_STORE_DELAY_BUFFER_MS)

    const cachedResponse = await page.reload()
    expect(cachedResponse?.status()).toBe(200)
    expect(cachedResponse?.headers()['cdn-cache-control']).toBe('public, max-age=60')
    // Page includes `Date.now()` so it can only have the same etag if it's the previously cached response
    expect(cachedResponse?.headers()['debug-x-nf-gen-etag']).toBe(ssrResponse?.headers()['debug-x-nf-gen-etag'])
  })

  defineTest('Netlify Edge Middleware can add response headers', async (page, site) => {
    const response = await page.goto(`${site.url}/middleware-header`)
    expect(response?.status()).toBe(200)
    expect(response?.headers()['foo']).toBe('bar')
  })
}

test.describe('React Router user journeys', () => {
  // Origin SSR — run the same suite across the (React Router major × Vite major) support matrix.
  test.describe('origin SSR (React Router 7, Vite 6)', () => {
    defineOriginSsrTests((title, body) =>
      test(title, async ({ page, reactRouterServerlessSite }) => body(page, reactRouterServerlessSite)),
    )
  })

  test.describe('origin SSR (React Router 7, Vite 7)', () => {
    defineOriginSsrTests((title, body) =>
      test(title, async ({ page, reactRouterServerlessSiteRR7Vite7 }) => body(page, reactRouterServerlessSiteRR7Vite7)),
    )
  })

  test.describe('origin SSR (React Router 8, Vite 7)', () => {
    defineOriginSsrTests((title, body) =>
      test(title, async ({ page, reactRouterServerlessSiteV8 }) => body(page, reactRouterServerlessSiteV8)),
    )
  })

  test.describe('origin SSR (React Router 8, Vite 8)', () => {
    defineOriginSsrTests((title, body) =>
      test(title, async ({ page, reactRouterServerlessSiteV8Vite8 }) => body(page, reactRouterServerlessSiteV8Vite8)),
    )
  })

  // The `future.v8_middleware` flag is React Router 7-specific (it is the default in v8), so these
  // are not part of the version-parameterized suite above.
  test.describe('origin SSR (React Router 7, v8_middleware flag)', () => {
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
  })

  // Edge SSR — run the same suite across the (React Router major × Vite major) support matrix.
  test.describe('edge SSR (React Router 7, Vite 6)', () => {
    defineEdgeSsrTests((title, body) =>
      test(title, async ({ page, reactRouterEdgeSite }) => body(page, reactRouterEdgeSite)),
    )
  })

  test.describe('edge SSR (React Router 7, Vite 7)', () => {
    defineEdgeSsrTests((title, body) =>
      test(title, async ({ page, reactRouterEdgeSiteRR7Vite7 }) => body(page, reactRouterEdgeSiteRR7Vite7)),
    )
  })

  test.describe('edge SSR (React Router 8, Vite 7)', () => {
    defineEdgeSsrTests((title, body) =>
      test(title, async ({ page, reactRouterEdgeSiteV8 }) => body(page, reactRouterEdgeSiteV8)),
    )
  })

  test.describe('edge SSR (React Router 8, Vite 8)', () => {
    defineEdgeSsrTests((title, body) =>
      test(title, async ({ page, reactRouterEdgeSiteV8Vite8 }) => body(page, reactRouterEdgeSiteV8Vite8)),
    )
  })

  // The `future.v8_middleware` flag is React Router 7-specific (it is the default in v8), so these
  // are not part of the version-parameterized suite above.
  test.describe('edge SSR (React Router 7, v8_middleware flag)', () => {
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
  })

  test.describe('edge SSR (custom basename)', () => {
    // If the user configures Vite's `build.assetsDir` to `foo`, ensure that requests to `/foo/*`
    // are not mistaken for static assets. There's also a variant of this where `basename` in
    // the RR config is *also* set to `foo`, making *every* request start with `/foo`.
    test('serves a response for a route incidentally prefixed with the Vite `build.assetsDir`', async ({
      page,
      reactRouterEdgeWithBasepath,
    }) => {
      const homeResponse = await page.goto(`${reactRouterEdgeWithBasepath.url}/fr`)
      expect(homeResponse?.status()).toBe(200)
      await expect(page.getByRole('heading', { name: /Bienvenue à React Router/i })).toBeVisible()

      const animalsResponse = await page.goto(`${reactRouterEdgeWithBasepath.url}/fr/animals`)
      expect(animalsResponse?.status()).toBe(200)
      await expect(page.getByRole('heading', { name: /Animaux/i })).toBeVisible()
    })
  })

  test.describe('Hydrogen React Router site', () => {
    test('serves a response from the edge when using @netlify/vite-plugin-react-router and a root `server.ts`', async ({
      page,
      hydrogenReactRouterSite,
    }) => {
      const response = await page.goto(hydrogenReactRouterSite.url)
      expect(response?.status()).toBe(200)
      await expect(page.getByText('Mock.shop')).toBeVisible()
      await expect(page.getByText('Recommended Products')).toBeVisible()
      expect(response?.headers()['debug-x-nf-edge-functions']).toBe('react-router-server')
    })
  })
})
