// Virtual entry point for the app
import * as remixBuild from '@remix-run/dev/server-build'
import { createRequestHandler as netlifyCreateRequestHandler } from '@netlify/remix-edge-adapter'
import { createRequestHandler as hydrogenCreateRequestHandler, getStorefrontHeaders } from '@shopify/remix-oxygen'
import { createStorefrontClient, storefrontRedirect } from '@shopify/hydrogen'

export async function getHydrogenClient({ env, request, waitUntil, caches, HydrogenSession, getLocaleFromRequest }) {
  /**
   * Open a cache instance in the worker and a custom session instance.
   */
  if (!env?.SESSION_SECRET) {
    throw new Error('SESSION_SECRET environment variable is not set')
  }

  const [cache, session] = await Promise.all([
    caches ? caches.open('hydrogen') : Promise.resolve(undefined),
    HydrogenSession.init(request, [env.SESSION_SECRET]),
  ])

  /**
   * Create Hydrogen's Storefront client.
   */
  const { storefront } = createStorefrontClient({
    cache,
    waitUntil,
    i18n: getLocaleFromRequest(request),
    publicStorefrontToken: env.PUBLIC_STOREFRONT_API_TOKEN,
    privateStorefrontToken: env.PRIVATE_STOREFRONT_API_TOKEN,
    storeDomain: env.PUBLIC_STORE_DOMAIN,
    storefrontId: env.PUBLIC_STOREFRONT_ID,
    storefrontHeaders: getStorefrontHeaders(request),
  })

  return {
    storefront,
    session,
  }
}

export function createHydrogenHandler(overrides) {
  return async function (request, env, executionContext) {
    const waitUntil = (p) => executionContext.waitUntil(p)
    const { storefront, session } = await getHydrogenClient(
      Object.assign(
        {
          request,
          env,
          waitUntil,
          caches,
        },
        overrides,
      ),
    )

    const handler = await hydrogenCreateRequestHandler({
      build: remixBuild,
      mode: process.env.NODE_ENV,
      getLoadContext: () => ({
        session,
        waitUntil,
        storefront,
        env,
      }),
    })

    const response = await handler(request)

    if (response.status === 404) {
      /**
       * Check for redirects only when there's a 404 from the app.
       * If the redirect doesn't exist, then `storefrontRedirect`
       * will pass through the 404 response.
       */
      return storefrontRedirect({ request, response, storefront })
    }

    return response
  }
}

/**
 * Export an Netlify Edge function handler in module format.
 */
export function createNetlifyEdgeHandler(overrides) {
  return async function (request, context) {
    // eslint-disable-next-line no-undef
    const env = Netlify.env.toObject()
    const waitUntil = () => Promise.resolve()
    const { storefront, session } = await getHydrogenClient(
      Object.assign(
        {
          request,
          env,
          waitUntil,
        },
        overrides,
      ),
    )

    const handler = await netlifyCreateRequestHandler({
      build: remixBuild,
      mode: 'production',
      getLoadContext: () => ({
        session,
        waitUntil,
        storefront,
        env,
      }),
    })

    const response = await handler(request, context)

    return response
  }
}

export function generateHandlerFunction(overrides) {
  return process.env.NODE_ENV === 'production'
    ? createNetlifyEdgeHandler(overrides)
    : {
        fetch: createHydrogenHandler(overrides),
      }
}
