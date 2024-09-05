# Remix Edge Adapter for Netlify

The Remix Edge Adapter for Netlify allows you to deploy your [Remix](https://remix.run) app to
[Netlify Edge Functions](https://docs.netlify.com/edge-functions/overview/).

## Usage

It is strongly advised to use [the Netlify Remix template](https://github.com/netlify/remix-template) to create a Remix
site for deployment to Netlify. See [Remix on Netlify](https://docs.netlify.com/frameworks/remix/) for more details and
other options.

However, if you are using **Remix Vite**, you can instead deploy your existing site to Netlify by following these steps:

1. Add dependencies on `@netlify/remix-edge-adapter` and `@netlify/remix-runtime`
2. Use the Netlify Remix edge Vite plugin in your Vite config:

```js
// vite.config.js
import { vitePlugin as remix } from "@remix-run/dev";
import { netlifyPlugin } from "@netlify/remix-edge-adapter/plugin";

export default defineConfig({
  plugins: [remix(), netlifyPlugin(),
});
```

3. Add an `app/entry.jsx` (.tsx if using TypeScript) with these contents:

```js
// app.entry.jsx or .tsx
export { default } from 'virtual:netlify-server-entry'
```

### Hydrogen

Hydrogen Vite sites are supported and automatically detected. However, additional setup is required. See
<https://github.com/netlify/hydrogen-template> for details.
