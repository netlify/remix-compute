import * as build from '@remix-run/dev/server-build'
import { createRequestHandler } from '@netlify/remix-adapter'
import type { Context, Config } from '@netlify/functions'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const handle = createRequestHandler({
  build,
  mode: process.env.NODE_ENV,
})

export default async function handler(request: Request, context: Context) {
  console.log('handler')
  return await fetch('https://www.netlify.com/favicon.ico')
  // return handle(request, context)
}

export const config: Config = {
  path: '/*',
}
