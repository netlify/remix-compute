/**
 * @type {import('@remix-run/dev').AppConfig}
 */
module.exports = {
  serverBuildTarget: 'deno',
  server: './server.js',
  ignoredRouteFiles: ['**/.*'],
  // appDirectory: "app",
  // assetsBuildDirectory: 'public/build',
  serverBuildPath: '.netlify/edge-functions/server.js',
  // publicPath: "/build/",
}
