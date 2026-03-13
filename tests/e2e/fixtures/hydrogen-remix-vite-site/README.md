# Hydrogen template: Skeleton

Hydrogen is Shopify’s stack for headless commerce. Hydrogen is designed to dovetail with [Remix](https://remix.run/),
Shopify’s full stack web framework. This template contains a **minimal setup** of components, queries and tooling to get
started with Hydrogen.

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/netlify/hydrogen-template#SESSION_SECRET=mock%20token&PUBLIC_STORE_DOMAIN=mock.shop)

- [Check out Hydrogen docs](https://shopify.dev/custom-storefronts/hydrogen)
- [Get familiar with Remix](https://remix.run/docs/)

## What's included

- Remix 2
- Hydrogen
- Shopify CLI
- ESLint
- Prettier
- GraphQL generator
- TypeScript and JavaScript flavors
- Minimal setup of components and routes

## Getting started

**Requirements:**

- Node.js version 18.0.0 or higher
- Netlify CLI 17.0.0 or higher

```bash
npm install -g netlify-cli@latest
```

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/netlify/hydrogen-template#SESSION_SECRET=mock%20token&PUBLIC_STORE_DOMAIN=mock.shop)

To create a new project, either click the "Deploy to Netlify" button above, or run the following command:

```bash
npx create-remix@latest --template=netlify/hydrogen-template
```

## Local development

```bash
npm run dev
```

## Building for production

```bash
npm run build
```
