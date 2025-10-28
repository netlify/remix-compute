# React Router Adapter for Netlify

The React Router Adapter for Netlify allows you to deploy your [React Router](https://reactrouter.com) app to Netlify.

## How to use

To deploy a React Router 7+ site to Netlify, install this package:

```sh
npm install @netlify/vite-plugin-react-router
```

It's also recommended (but not required) to use the
[Netlify Vite plugin](https://www.npmjs.com/package/@netlify/vite-plugin), which provides full Netlify platform
emulation directly in your local dev server:

```sh
npm install --save-dev @netlify/vite-plugin
```

and include the Netlify plugin in your `vite.config.ts`:

```typescript
import { reactRouter } from '@react-router/dev/vite'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import netlifyReactRouter from '@netlify/vite-plugin-react-router' // <- add this
import netlify from '@netlify/vite-plugin' // <- add this (optional)

export default defineConfig({
  plugins: [
    reactRouter(),
    tsconfigPaths(),
    netlifyReactRouter(), // <- add this
    netlify(), // <- add this (optional)
  ],
})
```

Your app is ready to [deploy to Netlify](https://docs.netlify.com/deploy/create-deploys/).

### Deploying to Edge Functions

By default, this plugin deploys your React Router app to
[Netlify Functions](https://docs.netlify.com/functions/overview/) (Node.js runtime). You can optionally deploy to
[Netlify Edge Functions](https://docs.netlify.com/edge-functions/overview/) (Deno runtime) instead.

First, toggle the `edge` option:

```typescript
export default defineConfig({
  plugins: [
    reactRouter(),
    tsconfigPaths(),
    netlifyReactRouter({ edge: true }), // <- deploy to Edge Functions
    netlify(),
  ],
})
```

Second, you **must** provide an `app/entry.server.tsx` (or `.jsx`) file that uses web-standard APIs compatible with the
Deno runtime. Create a file with the following content:

```tsx
import type { AppLoadContext, EntryContext } from 'react-router'
import { ServerRouter } from 'react-router'
import { isbot } from 'isbot'
import { renderToReadableStream } from 'react-dom/server'

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
```

You may need to `npm install isbot` if you do not have this dependency.

> [!IMPORTANT]
>
> This file uses `renderToReadableStream` (Web Streams API) instead of `renderToPipeableStream` (Node.js API), which is
> required for the Deno runtime. You may customize your server entry file, but see below for

#### Moving back from Edge Functions to Functions

To switch from Edge Functions back to Functions, you must:

1. Remove the `edge: true` option from your `vite.config.ts`
2. **Delete the `app/entry.server.tsx` file** (React Router will use its default Node.js-compatible entry)

#### Edge runtime

Before deploying to Edge Functions, review the Netlify Edge Functions documentation for important details:

- [Runtime environment](https://docs.netlify.com/build/edge-functions/api/#runtime-environment) - Understand the Deno
  runtime
- [Supported Web APIs](https://docs.netlify.com/build/edge-functions/api/#supported-web-apis) - Check which APIs are
  available
- [Limitations](https://docs.netlify.com/build/edge-functions/limits/) - Be aware of resource limits and constraints

### Load context

This plugin automatically includes all
[Netlify context](https://docs.netlify.com/build/functions/api/#netlify-specific-context-object) fields on loader and
action context.

If you're using TypeScript, `AppLoadContext` is automatically aware of these fields
([via module augmentation](https://reactrouter.com/upgrading/remix#9-update-types-for-apploadcontext)).

For example:

```tsx
import { useLoaderData } from 'react-router'
import type { Route } from './+types/example'

export async function loader({ context }: Route.LoaderArgs) {
  return {
    country: context.geo?.country?.name ?? 'an unknown country',
  }
}
export default function Example() {
  const { country } = useLoaderData<typeof loader>()
  return <div>You are visiting from {country}</div>
}
```

If you've [opted in to the `future.v8_middleware` flag](https://reactrouter.com/how-to/middleware), you can still use
the above access pattern for backwards compatibility, but loader and action context will now be an instance of the
type-safe `RouterContextProvider`. Note that this requires requires v2.0.0+ of `@netlify/vite-plugin-react-router`.

For example:

```tsx
import { netlifyRouterContext } from '@netlify/vite-plugin-react-router'
import { useLoaderData } from 'react-router'
import type { Route } from './+types/example'

export async function loader({ context }: Route.LoaderArgs) {
  return {
    country: context.get(netlifyRouterContext).geo?.country?.name ?? 'an unknown country',
  }
}
export default function Example() {
  const { country } = useLoaderData<typeof loader>()
  return <div>You are visiting from {country}</div>
}
```

> [!IMPORTANT]
>
> Note that in local development, `netlifyRouterContext` requires Netlify platform emulation, which is provided
> seamlessly by [`@netlify/vite-plugin`](https://www.npmjs.com/package/@netlify/vite-plugin) (or Netlify CLI - up to
> you).

### Middleware context

React Router introduced a stable middleware feature in 7.9.0.

To use middleware,
[opt in to the feature via `future.v8_middleware` and follow the docs](https://reactrouter.com/how-to/middleware). Note
that this requires requires v2.0.0+ of `@netlify/vite-plugin-react-router`.

To access the [Netlify context](https://docs.netlify.com/build/functions/api/#netlify-specific-context-object)
specifically, you must import our `RouterContextProvider` instance:

```tsx
import { netlifyRouterContext } from '@netlify/vite-plugin-react-router'

import type { Route } from './+types/home'

const logMiddleware: Route.MiddlewareFunction = async ({ request, context }) => {
  const country = context.get(netlifyRouterContext).geo?.country?.name ?? 'unknown'
  console.log(`Handling ${request.method} request to ${request.url} from ${country}`)
}

export const middleware: Route.MiddlewareFunction[] = [logMiddleware]

export default function Home() {
  return <h1>Hello world</h1>
}
```

> [!IMPORTANT]
>
> Note that in local development, `netlifyRouterContext` requires Netlify platform emulation, which is provided
> seamlessly by [`@netlify/vite-plugin`](https://www.npmjs.com/package/@netlify/vite-plugin) (or Netlify CLI - up to
> you).
