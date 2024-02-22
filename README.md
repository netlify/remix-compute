# Remix Compute for Netlify

The Remix Compute for Netlify packages allow you to deploy your Remix apps to
[Netlify Edge Functions](https://docs.netlify.com/edge-functions/overview/) or
[Netlify Functions](https://docs.netlify.com/functions/overview/).

This project is not a template for Remix apps. It is a set of packages used by the Netlify Remix template.

The project is a pnpm monorepo. Packages are located in the `packages` directory, and demo sites are in `demos`. There
are three packages:

- `@netlify/remix-adapter` - The Remix adapter for Netlify Functions
- `@netlify/remix-edge-adapter` - The Remix adapter for Netlify Edge Functions
- `@netlify/remix-runtime` - The Remix runtime for Netlify Edge Functions

## Installation

```bash
corepack enable
pnpm install
```

This installs all the dependencies for all the packages and builds the `@netlify/remix-runtime`,
`@netlify/remix-adapter`, and `@netlify/remix-edge-adapter` packages.

## Development

To build the packages, run the build command.

```bash
pnpm run build:packages
```

Run the build watch command to have packages built when they are changed.

```bash
pnpm run build:packages:watch
```

When you're ready to test your changes, you can run the demo site locally.

```bash
ntl build --offline
ntl serve
```
