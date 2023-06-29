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
  // See https://remix.run/pages/v2
  future: {
    v2_dev: true,
    v2_errorBoundary: true,
    v2_headers: true,
    v2_meta: true,
    v2_normalizeFormMethod: true,
    v2_routeConvention: true,
  },
}
