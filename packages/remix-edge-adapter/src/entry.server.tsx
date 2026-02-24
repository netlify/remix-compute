// This is used as a virtual module via Vite, loaded conditionally depending on whether we are in
// dev mode or not. This file is only loaded in production. We need to do this because in dev mode
// we are going through Vite which does not yet support Deno and thus uses Node.js.
// See https://github.com/vitejs/vite/discussions/16358.

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
  let isStreamClosing = false

  const abortController = new AbortController()
  request.signal.addEventListener('abort', () => {
    if (!isStreamClosing) {
      // only signal the abort if the stream is not already closing
      abortController.abort(request.signal.reason)
    }
  })

  // The main difference between this and the default Node.js entrypoint is
  // this use of web streams as opposed to Node.js streams.
  const body = await ReactDOMServer.renderToReadableStream(<RemixServer context={remixContext} url={request.url} />, {
    signal: abortController.signal,
    onError(error: unknown) {
      // Log streaming rendering errors from inside the shell
      console.error(error)
      responseStatusCode = 500
    },
  })

  // identity transform just to be able to listen for the flush event
  const transformedBody = body.pipeThrough(
    new TransformStream({
      flush() {
        isStreamClosing = true
      },
    }),
  )

  if (isbot(request.headers.get('user-agent') || '')) {
    await body.allReady
  }

  responseHeaders.set('Content-Type', 'text/html')
  return new Response(transformedBody, {
    headers: responseHeaders,
    status: responseStatusCode,
  })
}
