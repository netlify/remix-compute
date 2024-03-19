import * as build from '@remix-run/dev/server-build'
import { createRequestHandler } from '@netlify/remix-edge-adapter'
import { broadcastDevReady } from '@netlify/remix-runtime'
import type { Config } from '@netlify/edge-functions'

export default createRequestHandler({
  build,
  // process.env.NODE_ENV is provided by Remix at compile time
  mode: process.env.NODE_ENV,
})

if (process.env.NODE_ENV === 'development') {
  // Tell remix dev that the server is ready when this module is loaded
  broadcastDevReady(build)
}

export const config: Config = {
  path: '/*',
  // Let the CDN handle requests for static assets
  // Add other exclusions here, e.g. "/api/*" for custom Netlify functions or
  // custom Netlify Edge Functions, or if you add other static files
  excludedPath: ['/build/*', '/favicon.ico'],
  // Allow Remix to set cache headers
  cache: 'manual',
}
