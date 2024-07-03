import type { AppConfig } from '@remix-run/dev'

export const config: AppConfig = {
  ignoredRouteFiles: ['**/.*'],
  server: './server.ts',
  serverBuildPath: './.netlify/functions-internal/server.mjs',
  serverModuleFormat: 'esm',
}
