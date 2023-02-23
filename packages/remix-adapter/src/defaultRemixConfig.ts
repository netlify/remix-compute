import type { AppConfig } from '@remix-run/dev'

export const config: AppConfig = {
  server: './server.js',
  ignoredRouteFiles: ['**/.*'],
  serverBuildPath: '.netlify/functions-internal/server.js',
}
