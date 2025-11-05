// All these `function-handler` exports are here for backwards compatibility. Now that we have separate exports
// for Function and Edge Functions, we should remove these exports in a future major version.
export type { GetLoadContextFunction, RequestHandler } from './runtimes/netlify-functions'
// Also, we never documented the `createRequestHandler` export, which has a very niche intended use case, and is not
// needed for the Edge Functions exports, so we should remove it as well.
export { createRequestHandler, netlifyRouterContext } from './runtimes/netlify-functions'

export { netlifyPlugin as default } from './plugin'
