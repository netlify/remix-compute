# Remix Compute for Netlify

The Remix Compute for Netlify packages allows you to deploy your Remix apps to Netlify on the Edge.

This project is not a template for Remix apps. It is a set of packages used by the Netlify Remix template.

The project is a monorepo. Packages are located in the `packages` directory. There are three packages:

- `@netlify/remix-runtime` - The Remix runtime for Netlify on the Edge
- `@netlify/remix-edge-adapter` - The Remix adapter for Netlify on the Edge
- `@netlify/remix-edge-demo-site` - A demo site for testing the packages

## Installation

```bash
npm install
```

This installs all the dependencies for all the packages and builds the `@netlify/remix-runtime` and
`@netlify/remix-edge-adapter` packages.
