# React Router Adapter for Netlify

The React Router Adapter for Netlify allows you to deploy your [React Router](https://reactrouter.com) app to
[Netlify Functions](https://docs.netlify.com/functions/overview/).

## How to use

To deploy a React Router 7+ site to Netlify, install this package:

```sh
npm install --save-dev @netlify/vite-plugin-react-router
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
import { getNetlifyRouterContext } from '@netlify/vite-plugin-react-router'
import { useLoaderData } from 'react-router'
import type { Route } from './+types/example'

export async function loader({ context }: Route.LoaderArgs) {
  return {
    country: context.get(getNetlifyRouterContext()).geo?.country?.name ?? 'an unknown country',
  }
}
export default function Example() {
  const { country } = useLoaderData<typeof loader>()
  return <div>You are visiting from {country}</div>
}
```

> [!IMPORTANT] Note that in local development, `getNetlifyRouterContext` requires Netlify platform emulation, which is
> provided seamlessly by [`@netlify/vite-plugin`](https://www.npmjs.com/package/@netlify/vite-plugin) (or Netlify CLI -
> up to you).

### Middleware context

React Router introduced a stable middleware feature in 7.9.0.

To use middleware,
[opt in to the feature via `future.v8_middleware` and follow the docs](https://reactrouter.com/how-to/middleware). Note
that this requires requires v2.0.0+ of `@netlify/vite-plugin-react-router`.

To access the [Netlify context](https://docs.netlify.com/build/functions/api/#netlify-specific-context-object)
specifically, you must import our `RouterContextProvider` instance:

```tsx
import { getNetlifyRouterContext } from '@netlify/vite-plugin-react-router'

import type { Route } from './+types/home'

const logMiddleware: Route.MiddlewareFunction = async ({ request, context }) => {
  const country = context.get(getNetlifyRouterContext()).geo?.country?.name ?? 'unknown'
  console.log(`Handling ${request.method} request to ${request.url} from ${country}`)
}

export const middleware: Route.MiddlewareFunction[] = [logMiddleware]

export default function Home() {
  return <h1>Hello world</h1>
}
```

> [!IMPORTANT] Note that in local development, `getNetlifyRouterContext` requires Netlify platform emulation, which is
> provided seamlessly by [`@netlify/vite-plugin`](https://www.npmjs.com/package/@netlify/vite-plugin) (or Netlify CLI -
> up to you).
