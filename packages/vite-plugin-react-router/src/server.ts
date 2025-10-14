import type { AppLoadContext, ServerBuild } from 'react-router'
import {
  createContext,
  RouterContextProvider,
  createRequestHandler as createReactRouterRequestHandler,
} from 'react-router'
import type { Context as NetlifyContext } from '@netlify/functions'

// Augment the user's `AppLoadContext` to include Netlify context fields
// This is the recommended approach: https://reactrouter.com/upgrading/remix#9-update-types-for-apploadcontext.
declare module 'react-router' {
  interface AppLoadContext extends NetlifyContext {}
}

/**
 * A function that returns the value to use as `context` in route `loader` and `action` functions.
 *
 * You can think of this as an escape hatch that allows you to pass environment/platform-specific
 * values through to your loader/action.
 *
 * NOTE: v7.9.0 introduced a breaking change when the user opts in to `future.v8_middleware`. This
 * requires returning an instance of `RouterContextProvider` instead of a plain object.
 */
export type GetLoadContextFunction = GetLoadContextFunction_V7 | GetLoadContextFunction_V8
export type GetLoadContextFunction_V7 = (
  request: Request,
  context: NetlifyContext,
) => Promise<AppLoadContext> | AppLoadContext
export type GetLoadContextFunction_V8 = (
  request: Request,
  context: NetlifyContext,
) => Promise<RouterContextProvider> | RouterContextProvider

export type RequestHandler = (request: Request, context: NetlifyContext) => Promise<Response>

/**
 * An instance of `ReactContextProvider` providing access to
 * [Netlify request context]{@link https://docs.netlify.com/build/functions/api/#netlify-specific-context-object}
 *
 * @example context.get(netlifyContextProvider).geo?.country?.name
 */
export const netlifyContextProvider = createContext<NetlifyContext>()

/**
 * Given a build and a callback to get the base loader context, this returns
 * a Netlify Function handler (https://docs.netlify.com/functions/overview/) which renders the
 * requested path. The loader context in this lifecycle will contain the Netlify Functions context
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

  return async (request: Request, netlifyContext: NetlifyContext): Promise<Response> => {
    const start = Date.now()
    console.log(`[${request.method}] ${request.url}`)
    try {
      const getDefaultReactRouterContext = () => {
        const ctx = new RouterContextProvider()
        ctx.set(netlifyContextProvider, netlifyContext)
        return ctx
      }
      const reactRouterContext = (await getLoadContext?.(request, netlifyContext)) ?? getDefaultReactRouterContext()

      // @ts-expect-error -- I don't think there's any way to type this properly. We're passing a
      // union of the two types here, but this function accepts a conditional type based on the
      // presence of the `future.v8_middleware` flag in the user's config, which we don't have access to.
      const response = await reactRouterHandler(request, reactRouterContext)

      // A useful header for debugging
      response.headers.set('x-nf-runtime', 'Node')
      console.log(`[${response.status}] ${request.url} (${Date.now() - start}ms)`)
      return response
    } catch (error) {
      console.error(error)

      return new Response('Internal Error', { status: 500 })
    }
  }
}
