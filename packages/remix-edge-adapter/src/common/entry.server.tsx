// This is mostly copied from the Remix Deno template
// https://github.com/remix-run/remix/blob/main/templates/classic-remix-compiler/deno/app/entry.server.tsx

// When using the classic Remix compiler, this is imported directly from the site's `app/entry.server`.
// When using Vite, we load this as a virtual module, so that it can be loaded conditionally
// depending on whether we are in dev mode or not. This file is only loaded in production.
// We need to do this because in dev mode we are going through Vite which does not yet suport
// Deno and thus uses Node.js. See https://github.com/vitejs/vite/discussions/16358.

import type { AppLoadContext, EntryContext } from '@netlify/remix-runtime'
import { RemixServer } from '@remix-run/react'
import { isbot } from 'isbot'
import * as ReactDOMServer from 'react-dom/server'

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
  _loadContext: AppLoadContext,
) {
  // The main difference between this and the default Node.js entrypoint is
  // this use of web streams as opposed to Node.js streams.
  const body = await ReactDOMServer.renderToReadableStream(<RemixServer context={remixContext} url={request.url} />, {
    signal: request.signal,
    onError(error: unknown) {
      // Log streaming rendering errors from inside the shell
      console.error(error)
      responseStatusCode = 500
    },
  })

  if (isbot(request.headers.get('user-agent') || '')) {
    await body.allReady
  }

  responseHeaders.set('Content-Type', 'text/html')
  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  })
}
