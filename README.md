# Remix Compute for Netlify

The Remix Compute for Netlify packages allow you to deploy your Remix apps to
[Netlify Edge Functions](https://docs.netlify.com/edge-functions/overview/) or
[Netlify Functions](https://docs.netlify.com/functions/overview/).

This project is not a template for Remix apps. It is a set of packages used by
[the Netlify Remix template](https://github.com/netlify/remix-template).

The project is a pnpm monorepo. Packages are located in the `packages` directory, and demo sites are in `demos`. There
are three packages:

- `@netlify/remix-adapter` - The Remix adapter for Netlify Functions
- `@netlify/remix-edge-adapter` - The Remix adapter for Netlify Edge Functions
- `@netlify/remix-runtime` - The Remix runtime for Netlify Edge Functions

## Development

### Installation

```bash
corepack enable
pnpm install
```

This installs all the dependencies for all the packages and builds the `@netlify/remix-runtime`,
`@netlify/remix-adapter`, and `@netlify/remix-edge-adapter` packages.

### Testing

To build the packages, run the build command.

```bash
pnpm run build:packages
```

Run the build watch command to have packages built when they are changed.

```bash
pnpm run build:packages:watch
```

To run unit tests:

```bash
pnpm run test:unit
```

To run all tests (including linting and typechecking):

```bash
pnpm run test
```

#### End-to-end integration tests

These tests are meant to be very terse, basic, happy-path "user journey" system tests. These should generally map to
user-facing features and should rarely be added to.

Prerequisites:

- [Netlify CLI](https://docs.netlify.com/cli/get-started/) installed globally
- Install Playwright browsers (it should prompt you automatically the first time):
  - `pnpm exec playwright install --with-deps`

To run end-to-end integration tests:

```bash
pnpm run test:e2e
```

To add a new fixture site called `my-fixture`:

1. create a new directory `tests/e2e/fixtures/my-fixture`
2. register it in `tests/e2e/support/fixtures` as `myFixture`
3. [inject `myFixture` directly into any test](https://playwright.dev/docs/test-fixtures#using-a-fixture)
