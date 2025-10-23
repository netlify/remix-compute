# Remix Compute for Netlify

The Remix Compute for Netlify packages allow you to deploy your Remix apps to
[Netlify Edge Functions](https://docs.netlify.com/edge-functions/overview/) or
[Netlify Functions](https://docs.netlify.com/functions/overview/).

This project is not a template for Remix apps. It is a set of packages used by
[the Netlify Remix template](https://github.com/netlify/remix-template).

The project is a pnpm monorepo. Packages are located in the `packages` directory, and demo sites are in `demos`. There
are four packages:

- `@netlify/remix-adapter` - The Remix adapter for Netlify Functions
- `@netlify/remix-edge-adapter` - The Remix adapter for Netlify Edge Functions
- `@netlify/remix-runtime` - The Remix runtime for Netlify Edge Functions
- `@netlify/vite-plugin-react-router` - The React Router 7+ Vite plugin for Netlify

## Hydrogen

Shopify Hydrogen sites are supported and automatically detected. However, only
[the edge adapter](./packages/remix-edge-adapter/README.md) is supported, and only when using Remix Vite.

## Development

See the [CONTRIBUTING.md](./CONTRIBUTING.md) file for development setup, testing, and contribution guidelines.
