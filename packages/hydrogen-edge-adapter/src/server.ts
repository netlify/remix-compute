/// <reference types="@shopify/oxygen-workers-types" />

import * as remixBuild from '@remix-run/dev/server-build'
import { createRequestHandler as netlifyCreateRequestHandler, type RequestHandler } from '@netlify/remix-edge-adapter'
import { createRequestHandler as hydrogenCreateRequestHandler, getStorefrontHeaders } from '@shopify/remix-oxygen'
import { createStorefrontClient, storefrontRedirect } from '@shopify/hydrogen'

import type { Context } from '@netlify/edge-functions'
import type { AppLoadContext } from '@netlify/remix-runtime'

type LoadContext = AppLoadContext & Context

type Env = {
  SESSION_SECRET: string
  PUBLIC_STOREFRONT_API_TOKEN: string
  PRIVATE_STOREFRONT_API_TOKEN: string
  PUBLIC_STORE_DOMAIN: string
  PUBLIC_STOREFRONT_ID: string
}

type GetHydrogenClientObject = {
  env: Env
  request: Request
  waitUntil: any
  HydrogenSession: any
  getLocaleFromRequest: any
}

export async function getHydrogenClient(args: GetHydrogenClientObject) {
  const { env, request, waitUntil, HydrogenSession, getLocaleFromRequest } = args

  if (!env?.SESSION_SECRET) {
    throw new Error('SESSION_SECRET environment variable is not set')
  }

  /**
   * Open a cache instance in the worker and a custom session instance.
   */
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

type HandlerOverrides = {
  HydrogenSession: any
  getLocaleFromRequest: any
}

export function createHydrogenHandler(overrides: HandlerOverrides) {
  return async function (request: Request, env: Env, executionContext: ExecutionContext): Promise<Response> {
    const waitUntil = (p: Promise<any>) => executionContext.waitUntil(p)

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

    const handler = hydrogenCreateRequestHandler({
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
export function createNetlifyEdgeHandler(overrides: HandlerOverrides): RequestHandler {
  return async function (request: Request, context: LoadContext) {
    const waitUntil = () => Promise.resolve()
    const env: Env = {
      SESSION_SECRET: process.env.SESSION_SECRET ?? '',
      PUBLIC_STOREFRONT_API_TOKEN: process.env.PUBLIC_STOREFRONT_API_TOKEN ?? '',
      PRIVATE_STOREFRONT_API_TOKEN: process.env.PRIVATE_STOREFRONT_API_TOKEN ?? '',
      PUBLIC_STORE_DOMAIN: process.env.PUBLIC_STORE_DOMAIN ?? '',
      PUBLIC_STOREFRONT_ID: process.env.PUBLIC_STOREFRONT_ID ?? '',
    }

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

    const handler = netlifyCreateRequestHandler({
      build: remixBuild,
      mode: 'production',
      getLoadContext: () => {
        return Object.assign(
          {
            session,
            storefront,
            waitUntil,
            env,
          },
          context,
        )
      },
    })

    const response = await handler(request, context)

    return response
  }
}

export function generateHandlerFunction(overrides: HandlerOverrides) {
  return process.env.NODE_ENV === 'production'
    ? createNetlifyEdgeHandler(overrides)
    : {
        fetch: createHydrogenHandler(overrides),
      }
}
