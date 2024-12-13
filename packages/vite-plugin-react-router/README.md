# React Router Adapter for Netlify

The React Router Adapter for Netlify allows you to deploy your [React Router](https://reactrouter.com) app to
[Netlify Functions](https://docs.netlify.com/functions/overview/).

To deploy a React Router 7+ site to Netlify, install this package:

## How to use

```sh
npm --save-dev install @netlify/vite-plugin-react-router
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
