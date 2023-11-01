import type { AppLoadContext, EntryContext } from '@netlify/remix-runtime'
import { RemixServer } from '@remix-run/react'
import isbot from 'isbot'
import reactDomServer from 'react-dom/server'

export async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
  loadContext: AppLoadContext,
) {
  const body = await reactDomServer.renderToReadableStream(<RemixServer context={remixContext} url={request.url} />, {
    signal: request.signal,
    onError(error: unknown) {
      // Log streaming rendering errors from inside the shell
      console.error(error)
      responseStatusCode = 500
    },
  })

  if (isbot(request.headers.get('user-agent'))) {
    await body.allReady
  }

  responseHeaders.set('Content-Type', 'text/html')
  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  })
}
