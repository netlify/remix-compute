# Hydrogen Remix Adapter for Netlify

The Hydrogen Remix Adapter for Netlify allows you to deploy your [Shopify Hydrogen](https://hydrogen.shopify.dev/) (via
[Remix](https://remix.run)) app to [Netlify Edge Functions](https://docs.netlify.com/edge-functions/overview/).

**Important usage note**: Hydrogen’s Remix support (namely `@shopify/remix-oxygen/package.json`) hardcodes to a specific
version of Remix and as such this adapter is tied to a specific version of Remix.

## Usage

1. Modify your `server.js` file to use Netlify’s Hydrogen Edge Adapter:

```js
import { generateHandlerFunction, netlifyEdgeConfig } from '@netlify/hydrogen-edge-adapter'

// Project-specific imports
import { HydrogenSession } from '~/lib/session.server'
import { getLocaleFromRequest } from '~/lib/utils'

export default generateHandlerFunction({
  HydrogenSession,
  getLocaleFromRequest,
})

// Netlify Edge Function configuration
export { netlifyEdgeConfig as config }
```

2. Modify your `remix.config.js` with Netlify configuration changes:

```js
const baseConfig = require('@netlify/hydrogen-edge-adapter/config')

/** @type {import('@remix-run/dev').AppConfig} */
module.exports = {
  appDirectory: 'app',
  // (some Remix configuration omitted for brevity)

  // Netlify Overrides
  ...baseConfig,
}
```

3. Add a `netlify.toml` file using the `@netlify/hydrogen-integration` build integration:

```toml
[build]
command = "npm run build"
publish = "public"

[dev]
command = "npm run dev"
targetPort = 3000

[[plugins]]
package = "@netlify/hydrogen-integration"
```

4. Run `npx netlify serve` in your project root to host your Hydrogen project via the Netlify CLI. You may also run the
   Shopify Hydrogen/Remix dev server directly with `npm run dev`.
