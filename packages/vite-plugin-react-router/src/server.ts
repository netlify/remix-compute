import type { AppLoadContext, ServerBuild } from 'react-router'
import { createRequestHandler as createReactRouterRequestHandler } from 'react-router'
import type { Context as NetlifyContext } from '@netlify/functions'

// Augment the user's `AppLoadContext` to include Netlify context fields
// This is the recommended approach: https://reactrouter.com/upgrading/remix#9-update-types-for-apploadcontext.
declare module 'react-router' {
  interface AppLoadContext extends NetlifyContext {}
}

/**
 * A function that returns the value to use as `context` in route `loader` and
 * `action` functions.
 *
 * You can think of this as an escape hatch that allows you to pass
 * environment/platform-specific values through to your loader/action.
 */
export type GetLoadContextFunction = (request: Request, context: NetlifyContext) => Promise<LoadContext> | LoadContext

export type RequestHandler = (request: Request, context: LoadContext) => Promise<Response | void>

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

  return async (request: Request, netlifyContext: NetlifyContext): Promise<Response | void> => {
    const start = Date.now()
    console.log(`[${request.method}] ${request.url}`)
    try {
      const mergedLoadContext = (await getLoadContext?.(request, netlifyContext)) || netlifyContext

      const response = await reactRouterHandler(request, mergedLoadContext)

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
