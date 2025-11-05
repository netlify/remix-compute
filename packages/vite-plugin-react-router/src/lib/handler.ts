import {
  type ServerBuild,
  type RouterContext,
  RouterContextProvider,
  createRequestHandler as createReactRouterRequestHandler,
} from 'react-router'

import type { GetLoadContextFunction } from './context'

/**
 * Configuration for creating a Netlify request handler
 */
export interface CreateRequestHandlerConfig<TNetlifyContext> {
  build: ServerBuild
  mode?: string
  getLoadContext?: GetLoadContextFunction<TNetlifyContext>
  netlifyRouterContext: RouterContext<Partial<TNetlifyContext>>
  runtimeName: string
}

export type RequestHandler<TNetlifyContext> = (
  request: Request,
  context: TNetlifyContext,
) => Promise<Response>

/**
 * Shared implementation for creating Netlify request handlers (Functions or Edge Functions).
 * This is the core logic used by both function-handler and edge-function-handler.
 */
export function createNetlifyRequestHandler<TNetlifyContext>({
  build,
  mode,
  getLoadContext,
  netlifyRouterContext,
  runtimeName,
}: CreateRequestHandlerConfig<TNetlifyContext>): RequestHandler<TNetlifyContext> {
  const reactRouterHandler = createReactRouterRequestHandler(build, mode)

  return async (request: Request, netlifyContext: TNetlifyContext): Promise<Response> => {
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
      const reactRouterContext =
        (await getLoadContext?.(request, netlifyContext)) ?? getDefaultReactRouterContext()

      // @ts-expect-error -- createReactRouterRequestHandler has conditional types based on the
      // presence of `future.v8_middleware` in the user's config. When enabled, it expects
      // RouterContextProvider; when disabled, it expects AppLoadContext. We can't know at compile
      // time which the user has enabled, so we pass a union type. At runtime, the correct type will
      // be used based on the user's configuration.
      const response = await reactRouterHandler(request, reactRouterContext)

      // A useful header for debugging
      response.headers.set('x-nf-runtime', runtimeName)

      console.log(`[${response.status}] ${request.url} (${Date.now() - start}ms)`)
      return response
    } catch (error) {
      console.error(error)

      return new Response('Internal Error', { status: 500 })
    }
  }
}