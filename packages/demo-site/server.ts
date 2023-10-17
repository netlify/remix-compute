/* eslint-disable @typescript-eslint/no-unused-vars */
import * as build from '@remix-run/dev/server-build'
import { createRequestHandler } from '@netlify/remix-adapter'
import { installGlobals } from '@remix-run/node'
import type { Config } from '@netlify/functions'

installGlobals()

const handle = createRequestHandler({
  build,
  mode: process.env.NODE_ENV,
})

export default function handler(event, context) {
  return handle(event, context)
}
const config: Config = {
  path: '/*',
}
