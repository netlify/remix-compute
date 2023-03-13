import type { AppConfig } from '@remix-run/dev'

export const config: AppConfig = {
  serverBuildTarget: 'deno',
  server: './server.js',
  ignoredRouteFiles: ['**/.*'],
  serverBuildPath: '.netlify/edge-functions/server.js',
  serverModuleFormat: 'esm',
  serverPlatform: 'neutral',
  // See https://remix.run/docs/en/main/file-conventions/route-files-v2
  future: {
    v2_routeConvention: true,
  },
}
