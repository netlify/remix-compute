# Upgrading from Remix 1 to Remix 2

The Remix docs contain a comprehensive [guide to upgrading your Remix site](https://remix.run/docs/en/main/start/v2)
from v1 to v2. This guide shows the steps that are specific to upgrading a site on Netlify.

## Update packages

The Netlify packages are now published under the `@netlify` scope. Update your `package.json` to use the new packages:

### Netlify Functions

```diff
{
  "dependencies": {
-   "@remix-run/netlify": "^1.0.0",
+   "@netlify/functions": "^2.0.0",
+   "@netlify/remix-adapter": "^2.0.0",
  }
}
```

Then update all of the other `@remix-run` packages to `^2.0.0`.

### Netlify Edge Functions

```diff
{
  "dependencies": {
-   "@remix-run/netlify-edge": "experimental-netlify-edge",
+   "@netlify/remix-edge-adapter": "^3.0.0",
+   "@remix-run/react": "^2.0.0",
  }
}
```

Then update all of the other `@remix-run` packages to `^2.0.0`.

## Update your `remix.config.js`

The config options have been greatly simplified in v2. Update your `remix.config.js` to use the new options. Use these
full examples as a reference, ensuring you copy over any customizations you've made to your own config.

### Netlify Functions

```js
import { config } from '@netlify/remix-adapter'

/** @type {import('@remix-run/dev').AppConfig} */
export default {
  ...config,
  // Add your custom config here.
}
```

### Netlify Edge Functions

```js
import { config } from '@netlify/remix-edge-adapter'

/** @type {import('@remix-run/dev').AppConfig} */
export default {
  ...config,
  // Add your custom config here.
}
```

## Update your entrypoint files

You need to update your server.ts and entry.server.ts files to v2. You should be able to copy these unchanged:

### Netlify Functions

- [`server.ts`](https://github.com/netlify/remix-compute/blob/main/packages/demo-site/server.ts)
- [`app/entry.server.tsx`](https://github.com/netlify/remix-compute/blob/main/packages/demo-site/app/entry.server.tsx)

### Netlify Edge Functions

- [`server.ts`](https://github.com/netlify/remix-compute/blob/main/packages/edge-demo-site/server.ts)
- [`app/entry.server.tsx`](https://github.com/netlify/remix-compute/blob/main/packages/edge-demo-site/app/entry.server.tsx)

## Update your build commands

Remix 2 includes [greatly improved support](https://remix.run/docs/en/main/start/v2#custom-app-server) for `remix dev`
with custom servers and runtimes, and the Netlify Edge Function adapter has full support.

You need to update your `dev` command in your `package.json` and `netlify.toml`:

### Netlify Edge Functions

```diff
{
  "scripts": {
-   "dev": "remix dev",
+   "dev": "remix dev --manual -c \"ntl dev --framework=#static\"",
  }
}
```

This means that when you run `npm run dev`, it will start the Remix dev server, and then start the Netlify dev server to
serve your Edge Functions. This gives full hot updates, while also running through the real Netlify Edge Functions
runtime.

The other difference is that if you were previously running `netlify dev` as your dev command, you should switch to
`npm run dev` instead, as the Remix dev server will now start the Netlify dev server for you, instead of vice versa.

### Netlify Functions

No updates are needed here, as it still uses the Node-based Remix dev server.
