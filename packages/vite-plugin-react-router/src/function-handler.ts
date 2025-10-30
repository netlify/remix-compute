import type { ServerBuild } from 'react-router'
import type { Context as NetlifyContext } from '@netlify/functions'

import { createNetlifyRequestHandler, type RequestHandler as RequestHandlerType } from './lib/handler'
import { createNetlifyRouterContext, type GetLoadContextFunction as GetLoadContextFunctionType } from './lib/context'

// Augment the user's `AppLoadContext` to include Netlify context fields
// This is the recommended approach: https://reactrouter.com/upgrading/remix#9-update-types-for-apploadcontext.
declare module 'react-router' {
  interface AppLoadContext extends NetlifyContext {}
}

export type GetLoadContextFunction = GetLoadContextFunctionType<NetlifyContext>
export type RequestHandler = RequestHandlerType<NetlifyContext>

/**
 * An instance of `RouterContext` providing access to
 * [Netlify request context]{@link https://docs.netlify.com/build/functions/api/#netlify-specific-context-object}
 *
 * @example context.get(netlifyRouterContext).geo?.country?.name
 */
export const netlifyRouterContext = createNetlifyRouterContext<NetlifyContext>()

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
  return createNetlifyRequestHandler({
    build,
    mode,
    getLoadContext,
    netlifyRouterContext,
    runtimeName: 'Node',
  })
}
