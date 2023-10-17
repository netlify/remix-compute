import * as build from '@remix-run/dev/server-build'
import { createRequestHandler } from '@netlify/remix-adapter'
import type { Config } from '@netlify/functions'

const handle = createRequestHandler({
  build,
  mode: process.env.NODE_ENV,
})

export default function handler(event, context) {
  return handle(event, context)
}

export const config: Config = {
  path: '/*',
}
