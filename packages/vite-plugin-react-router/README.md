# React Router Adapter for Netlify

The React Router Adapter for Netlify allows you to deploy your [React Router](https://reactrouter.com) app to
[Netlify Functions](https://docs.netlify.com/functions/overview/).

To deploy a React Router 7+ site to Netlify, install this package:

## How to use

```sh
npm install --save-dev @netlify/vite-plugin-react-router
```

and include the Netlify plugin in your `vite.config.ts`:

```typescript
import { reactRouter } from '@react-router/dev/vite'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import netlifyPlugin from '@netlify/vite-plugin-react-router' // <- add this

export default defineConfig({
  plugins: [
    reactRouter(),
    tsconfigPaths(),
    netlifyPlugin(), // <- add this
  ],
})
```

### Load context

This plugin automatically includes all
[Netlify context](https://docs.netlify.com/build/functions/api/#netlify-specific-context-object) fields on loader and
action context.

If you're using TypeScript, `AppLoadContext` is automatically aware of these fields
([via module augmentation](https://reactrouter.com/upgrading/remix#9-update-types-for-apploadcontext)).

### Middleware context

React Router introduced a stable middleware feature in 7.9.0.

To use middleware,
[opt in to the feature via `future.v8_middleware` and follow the docs](https://reactrouter.com/how-to/middleware). This
requires v1.1.0+ of `@netlify/vite-plugin-react-router`.

To access the [Netlify context](https://docs.netlify.com/build/functions/api/#netlify-specific-context-object)
specifically, you must import our `RouterContextProvider` instance:

```typescript
import { netlifyContextProvider } from "@netlify/vite-plugin-react-router";

import type { Route } from "./+types/home";

const logMiddleware: Route.MiddlewareFunction = async ({
  request,
  context,
}) => {
  const country = context.get(netlifyContextProvider).geo?.country?.name ?? "unknown";
  console.log(`Handling ${request.method} request to ${request.url} from ${country}`)
};

export const middleware: Route.MiddlewareFunction[] = [logMiddleware];

export default function Home() {
  return <h1>Hello world</h1>;
}
```
