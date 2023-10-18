import type { AppConfig } from '@remix-run/dev'

export const config: AppConfig = {
  server: './server.ts',
  ignoredRouteFiles: ['**/.*'],
  serverBuildPath: '.netlify/edge-functions/server.js',
  serverConditions: ['deno', 'worker'],
  serverDependenciesToBundle: 'all',
  serverMainFields: ['module', 'main'],
  serverModuleFormat: 'esm',
  serverPlatform: 'neutral',
}
