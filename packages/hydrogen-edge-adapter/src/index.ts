export const netlifyEdgeConfig = {
  path: '/*',

  // Allow Remix to handle caching Edge Functions
  // https://docs.netlify.com/edge-functions/optional-configuration/#configure-an-edge-function-for-caching
  cache: 'manual',

  // Let the CDN handle requests for static assets, i.e. /_assets/*
  // Add other exclusions here, e.g. "/api/*$" for custom Netlify functions or custom Netlify Edge Functions
  excludedPath: ['/build/*'],

  // Use built-in Remix error handling
  onError: 'bypass',
}

export { generateHandlerFunction } from './server.js'
