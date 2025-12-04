# Contributions

🎉 Thanks for considering contributing to this project! 🎉

When contributing to this repository, please first discuss the change you wish to make via an
[issue](https://github.com/netlify/remix-compute/issues/new/choose). Please use the issue templates. They are there to
help you and to help the maintainers gather information.

Before working on an issue, ask to be assigned to it. This makes it clear to other potential contributors that someone
is working on the issue.

When creating a PR, please use the template. The information in the template helps maintainers review your pull
request.```

This project was made with ❤️. The simplest way to give back is by starring and sharing it online.

Everyone is welcome regardless of personal background. We enforce a [Code of conduct](CODE_OF_CONDUCT.md) in order to
promote a positive and inclusive environment.

## Development process

First fork and clone the repository. If you're not sure how to do this, please watch
[these videos](https://egghead.io/courses/how-to-contribute-to-an-open-source-project-on-github).

### Installation

```bash
corepack enable
pnpm install
```

This installs all the dependencies for all the packages and builds the `@netlify/remix-runtime`,
`@netlify/remix-adapter`, `@netlify/remix-edge-adapter`, and `@netlify/vite-plugin-react-router` packages.

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

## How to write commit messages

We use [Conventional Commit messages](https://www.conventionalcommits.org/) to automate version management.

Most common commit message prefixes are:

- `fix:` which represents bug fixes, and generate a patch release.
- `feat:` which represents a new feature, and generate a minor release.
- `feat!:`, `fix!:` or `refactor!:` and generate a major release.

## Releasing

Merge the release PR
