/** @type {import('@remix-run/dev').AppConfig} */
export default {
  ignoredRouteFiles: ['**/.*'],
  server: process.env.NETLIFY || process.env.NETLIFY_LOCAL ? './server.ts' : undefined,
  serverBuildPath: './.netlify/functions-internal/server.js',
}
