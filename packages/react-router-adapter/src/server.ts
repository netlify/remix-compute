import type { AppLoadContext, ServerBuild } from '@remix-run/node'
import { createRequestHandler as createRemixRequestHandler } from '@remix-run/node'
import type { Context as NetlifyContext } from '@netlify/functions'

type LoadContext = AppLoadContext & NetlifyContext

/**
 * A function that returns the value to use as `context` in route `loader` and
 * `action` functions.
 *
 * You can think of this as an escape hatch that allows you to pass
 * environment/platform-specific values through to your loader/action.
 */
export type GetLoadContextFunction = (request: Request, context: NetlifyContext) => Promise<LoadContext> | LoadContext

export type RequestHandler = (request: Request, context: LoadContext) => Promise<Response | void>

// TODO: update with react-router reference
/**
 * See https://remix.run/docs/en/main/other-api/adapter.
 * This returns a Netlify Function handler: https://docs.netlify.com/functions/overview/.
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
  const reactRouterHandler = createRemixRequestHandler(build, mode)

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
