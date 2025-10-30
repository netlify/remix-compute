import type { ServerBuild } from 'react-router'
import type { Context as NetlifyEdgeContext } from '@netlify/edge-functions'

import { createNetlifyRequestHandler, type RequestHandler as RequestHandlerType } from './lib/handler'
import { createNetlifyRouterContext, type GetLoadContextFunction as GetLoadContextFunctionType } from './lib/context'

// Augment the user's `AppLoadContext` to include Netlify context fields
// This is the recommended approach: https://reactrouter.com/upgrading/remix#9-update-types-for-apploadcontext.
declare module 'react-router' {
  interface AppLoadContext extends NetlifyEdgeContext {}
}

export type GetLoadContextFunction = GetLoadContextFunctionType<NetlifyEdgeContext>
export type RequestHandler = RequestHandlerType<NetlifyEdgeContext>

/**
 * An instance of `RouterContext` providing access to
 * [Netlify request context]{@link https://docs.netlify.com/build/edge-functions/api/#netlify-specific-context-object}
 *
 * @example context.get(netlifyRouterContext).geo?.country?.name
 */
export const netlifyRouterContext = createNetlifyRouterContext<NetlifyEdgeContext>()

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
  return createNetlifyRequestHandler({
    build,
    mode,
    getLoadContext,
    netlifyRouterContext,
    runtimeName: 'edge',
  })
}
