import type { AppLoadContext, ServerBuild } from '@netlify/remix-runtime'
import { createRequestHandler as createRemixRequestHandler } from '@netlify/remix-runtime'
import type { Context } from '@netlify/edge-functions'

type LoadContext = AppLoadContext & Context

/**
 * A function that returns the value to use as `context` in route `loader` and
 * `action` functions.
 *
 * You can think of this as an escape hatch that allows you to pass
 * environment/platform-specific values through to your loader/action.
 */
export type GetLoadContextFunction = (request: Request, context: Context) => Promise<LoadContext> | LoadContext

export type RequestHandler = (request: Request, context: LoadContext) => Promise<Response | void>

/**
 * See https://remix.run/docs/en/main/other-api/adapter.
 * This returns a Netlify Edge Function handler: https://docs.netlify.com/edge-functions/overview/.
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
  const remixHandler = createRemixRequestHandler(build, mode)

  const assetPath = build.assets.url.split('/').slice(0, -1).join('/')

  return async (request: Request, context: LoadContext): Promise<Response | void> => {
    const { pathname } = new URL(request.url)
    // Skip the handler for static files. We've already configured the generated SSR Edge Function
    // not to run on these paths; this is just for good measure.
    if (pathname.startsWith(`${assetPath}/`)) {
      return
    }
    try {
      const loadContext = (await getLoadContext?.(request, context)) || context

      const response = await remixHandler(request, loadContext)

      // A useful header for debugging
      response.headers.set('x-nf-runtime', 'Edge')

      // FIXME: commented out here for dev, because dev middleware next() that is passed as `context.next` returns void
      // so this all fall apart in this case - need to figure out if this should be done elsewhere or maybe use this conditionally
      // for prod builds only
      // if (response.status === 404) {
      //   // Check if there is a matching static file
      //   const originResponse = await context.next({
      //     sendConditionalRequest: true,
      //   })
      //   if (originResponse.status !== 404) {
      //     return originResponse
      //   }
      // }
      return response
    } catch (error) {
      console.error(error)

      return new Response('Internal Error', { status: 500 })
    }
  }
}
