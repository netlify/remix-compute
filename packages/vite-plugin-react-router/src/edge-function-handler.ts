import type { AppLoadContext, ServerBuild } from 'react-router'
import {
  createContext,
  RouterContextProvider,
  createRequestHandler as createReactRouterRequestHandler,
} from 'react-router'
import type { Context as NetlifyEdgeContext } from '@netlify/edge-functions'

// Augment the user's `AppLoadContext` to include Netlify context fields
// This is the recommended approach: https://reactrouter.com/upgrading/remix#9-update-types-for-apploadcontext.
declare module 'react-router' {
  interface AppLoadContext extends NetlifyEdgeContext {}
}

/**
 * A function that returns the value to use as `context` in route `loader` and `action` functions.
 *
 * You can think of this as an escape hatch that allows you to pass environment/platform-specific
 * values through to your loader/action.
 *
 * NOTE: v7.9.0 introduced a breaking change when the user opts in to `future.v8_middleware`. This
 * requires returning an instance of `RouterContextProvider` instead of a plain object. We have a
 * peer dependency on >=7.9.0 so we can safely *import* these, but we cannot assume the user has
 * opted in to the flag.
 */
export type GetLoadContextFunction = GetLoadContextFunction_V7 | GetLoadContextFunction_V8
export type GetLoadContextFunction_V7 = (
  request: Request,
  context: NetlifyEdgeContext,
) => Promise<AppLoadContext> | AppLoadContext
export type GetLoadContextFunction_V8 = (
  request: Request,
  context: NetlifyEdgeContext,
) => Promise<RouterContextProvider> | RouterContextProvider

export type RequestHandler = (request: Request, context: NetlifyEdgeContext) => Promise<Response>

/**
 * An instance of `ReactContextProvider` providing access to
 * [Netlify request context]{@link https://docs.netlify.com/build/functions/api/#netlify-specific-context-object}
 *
 * @example context.get(netlifyRouterContext).geo?.country?.name
 */
export const netlifyRouterContext =
  // We must use a singleton because Remix contexts rely on referential equality.
  // We can't hook into the request lifecycle in dev mode, so we use a Proxy to always read from the
  // current `Netlify.context` value, which is always contextual to the in-flight request.
  createContext<Partial<NetlifyEdgeContext>>(
    new Proxy(
      // Can't reference `Netlify.context` here because it isn't set outside of a request lifecycle
      {},
      {
        get(_target, prop, receiver) {
          return Reflect.get(Netlify.context ?? {}, prop, receiver)
        },
        set(_target, prop, value, receiver) {
          return Reflect.set(Netlify.context ?? {}, prop, value, receiver)
        },
        has(_target, prop) {
          return Reflect.has(Netlify.context ?? {}, prop)
        },
        deleteProperty(_target, prop) {
          return Reflect.deleteProperty(Netlify.context ?? {}, prop)
        },
        ownKeys(_target) {
          return Reflect.ownKeys(Netlify.context ?? {})
        },
        getOwnPropertyDescriptor(_target, prop) {
          return Reflect.getOwnPropertyDescriptor(Netlify.context ?? {}, prop)
        },
      },
    ),
  )

/**
 * Given a build and a callback to get the base loader context, this returns
 * a Netlify Edge Function handler (https://docs.netlify.com/edge-functions/overview/) which renders the
 * requested path. The loader context in this lifecycle will contain the Netlify Edge Functions context
 * fields merged in.
 */
export function createRequestHandler({
  build,
  mode,
  getLoadContext,
}: {
  build: ServerBuild
  mode?: string
  getLoadContext?: GetLoadContextFunction
}): RequestHandler {
  const reactRouterHandler = createReactRouterRequestHandler(build, mode)

  return async (request: Request, netlifyContext: NetlifyEdgeContext): Promise<Response> => {
    const start = Date.now()
    console.log(`[${request.method}] ${request.url}`)
    try {
      const getDefaultReactRouterContext = () => {
        const ctx = new RouterContextProvider()
        ctx.set(netlifyRouterContext, netlifyContext)

        // Provide backwards compatibility with previous plain object context
        // See https://reactrouter.com/how-to/middleware#migration-from-apploadcontext.
        Object.assign(ctx, netlifyContext)

        return ctx
      }
      const reactRouterContext = (await getLoadContext?.(request, netlifyContext)) ?? getDefaultReactRouterContext()

      // @ts-expect-error -- I don't think there's any way to type this properly. We're passing a
      // union of the two types here, but this function accepts a conditional type based on the
      // presence of the `future.v8_middleware` flag in the user's config, which we don't have access to.
      const response = await reactRouterHandler(request, reactRouterContext)

      // We can return any React Router response as-is (whether it's a default 404, custom 404,
      // or any other response) because our edge function's excludedPath config is exhaustive -
      // static assets are excluded from the edge function entirely, so we never need to fall
      // through to the CDN.
      console.log(`[${response.status}] ${request.url} (${Date.now() - start}ms)`)
      return response
    } catch (error) {
      console.error(error)

      return new Response('Internal Error', { status: 500 })
    }
  }
}
