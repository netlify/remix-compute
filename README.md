# Remix Compute for Netlify

The Remix Compute for Netlify packages allow you to deploy your Remix apps to
[Netlify Edge Functions](https://docs.netlify.com/edge-functions/overview/).

This project is not a template for Remix apps. It is a set of packages used by the Netlify Remix template.

The project is a monorepo. Packages are located in the `packages` directory. There are three packages:

- `@netlify/remix-adapter` - The Remix adapter for Netlify Functions
- `remix-demo-site` - A demo site for testing the remix-adapter
- `@netlify/remix-runtime` - The Remix runtime for Netlify Edge Functions
- `@netlify/remix-edge-adapter` - The Remix adapter for Netlify Edge Functions
- `remix-edge-demo-site` - A demo site for testing the packages
- `@netlify/hydrogen-edge-adapter` - The Hydrogen/Remix adapter for Netlify Edge Functions
- `@netlify/hydrogen-integration` - The Netlify build integration for Hydrogen projects on Netlify

## Installation

```bash
npm install
```

This installs all the dependencies for all the packages and builds the `@netlify/remix-runtime`,
`@netlify/remix-adapter`, and `@netlify/remix-edge-adapter` packages.

## Development

Run the build watch command to have packages built when they are changed.

```bash
npm run build:watch
```

When you're ready to test your changes, you can run the demo site locally.

```bash
ntl build --offline
ntl serve
```
