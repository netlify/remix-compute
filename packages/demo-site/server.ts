import * as build from '@remix-run/dev/server-build'
import { createRequestHandler } from '@netlify/remix-adapter'
import type { Context, Config } from '@netlify/functions'

console.log('server.ts')

const handle = createRequestHandler({
  build,
  mode: process.env.NODE_ENV,
})

export default function handler(request: Request, context: Context) {
  console.log('handler')
  return handle(request, context)
}

export const config: Config = {
  path: '/*',
}
