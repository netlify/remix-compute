import { config } from '@netlify/remix-adapter'

/** @type {import('@remix-run/dev').AppConfig} */
export default {
  ...config,
  // See https://remix.run/pages/v2
  // This works out of the box with the Netlify adapter, but you can
  // add your own custom config here if you want to.
  //
  // See https://remix.run/file-conventions/remix-config
}
