import type { AppLoadContext, EntryContext } from 'react-router'
import { ServerRouter } from 'react-router'
import { isbot } from 'isbot'
import { renderToReadableStream } from 'react-dom/server'

/**
 * Edge-compatible server entry using Web Streams instead of Node.js Streams.
 * @see {@link https://reactrouter.com/api/framework-conventions/entry.server.tsx}
 *
 * This file was copied as-is from the React Router repository.
 * @see {@link
 * https://github.com/remix-run/react-router/blob/cb9a090316003988ff367bb2f2d1ef5bd03bd3af/integration/helpers/vite-plugin-cloudflare-template/app/entry.server.tsx}
 *
 *
 * @example Export this from your `app/entry.server.tsx` when using `edge: true`:
 *
 * ```tsx
 * export { default } from 'virtual:netlify-server-entry'
 * ```
 */
export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
  _loadContext: AppLoadContext,
) {
  let shellRendered = false
  const userAgent = request.headers.get('user-agent')

  const body = await renderToReadableStream(<ServerRouter context={routerContext} url={request.url} />, {
    onError(error: unknown) {
      responseStatusCode = 500
      // Log streaming rendering errors from inside the shell.  Don't log
      // errors encountered during initial shell rendering since they'll
      // reject and get logged in handleDocumentRequest.
      if (shellRendered) {
        console.error(error)
      }
    },
  })
  shellRendered = true

  // Ensure requests from bots and SPA Mode renders wait for all content to load before responding
  // https://react.dev/reference/react-dom/server/renderToPipeableStream#waiting-for-all-content-to-load-for-crawlers-and-static-generation
  if ((userAgent && isbot(userAgent)) || routerContext.isSpaMode) {
    await body.allReady
  }

  responseHeaders.set('Content-Type', 'text/html')
  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  })
}
