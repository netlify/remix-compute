import type { AppLoadContext, ServerBuild } from '@remix-run/node'
import { createRequestHandler as createRemixRequestHandler } from '@remix-run/node'
import type { Context } from '@netlify/functions'

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
  const remixHandler = createRemixRequestHandler(build, mode)

  return async (request: Request, context: LoadContext): Promise<Response | void> => {
    const start = Date.now()
    console.log(`[${request.method}] ${request.url}`)
    try {
      const loadContext = (await getLoadContext?.(request, context)) || context

      const response = await remixHandler(request, loadContext)

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
