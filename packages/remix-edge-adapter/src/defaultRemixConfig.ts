import type { AppConfig } from '@remix-run/dev'

export const config: AppConfig = {
  serverBuildTarget: 'deno',
  server: './server.js',
  ignoredRouteFiles: ['**/.*'],
  serverBuildPath: '.netlify/edge-functions/server.js',
  serverModuleFormat: 'esm',
  serverPlatform: 'neutral',
}
