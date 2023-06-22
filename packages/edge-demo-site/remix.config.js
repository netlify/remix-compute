// eslint-disable-next-line @typescript-eslint/no-var-requires
const { config } = require('@netlify/remix-edge-adapter')

/** @type {import('@remix-run/dev').AppConfig} */
module.exports = {
  ...config,
  // This works out of the box with the Netlify adapter, but you can
  // add your own custom config here if you want to.
  //
  // See https://remix.run/file-conventions/remix-config

  // The server build path is configured to the root of the monorepo as that's
  //  where Netlify expects it to be because the base path is the root of the
  //  monorepo.
  //
  // This is not required in user land. It's only for the demo site.
  serverBuildPath: '../../.netlify/edge-functions/server.js',
}
