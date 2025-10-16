import { test as base } from '@playwright/test'

import { type Fixture, deployFixture } from './deploy-to-netlify'

/* eslint-disable-next-line @typescript-eslint/no-empty-interface */
interface TestFixtures {}
interface WorkerFixtures {
  /**
   * A (Vite) Remix site using origin SSR
   */
  serverlessSite: Fixture
  /**
   * A (Vite) Remix site using edge SSR
   */
  edgeSite: Fixture
  /**
   * A "classic" (non-Vite) Remix site using origin SSR
   */
  classicServerlessSite: Fixture
  /**
   * A "classic" (non-Vite) Remix site using edge SSR
   */
  classicEdgeSite: Fixture
  /**
   * A Hydrogen v2 site using Vite Remix and edge SSR
   *
   * NOTE: `PUBLIC_STORE_DOMAIN` and `SESSION_SECRET` are populated for this fixture
   */
  hydrogenViteSite: Fixture
  /**
   * A Hydrogen v2 site using Vite Remix and edge SSR, but invalid for use with Netlify packages
   * because it is missing a `server.ts` (or .js, etc.) SSR "entrypoint" file.
   *
   * As we intend for this to fail to build at all, the fixture resolves to an Error (or `null` if
   * it didn't fail).
   *
   * NOTE: `PUBLIC_STORE_DOMAIN` and `SESSION_SECRET` are populated for this fixture
   */
  hydrogenViteSiteNoEntrypoint: Error | null
  /**
   * A React Router 7 site using origin SSR
   */
  reactRouterServerlessSite: Fixture
  /**
   * A React Router 7 site using origin SSR and opted in to the `future.v8_middleware` flag
   */
  reactRouterWithV8Middleware: Fixture
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  serverlessSite: [
    async ({}, use) => {
      const fixture = await deployFixture('serverless-site')
      await use(fixture)
    },
    { scope: 'worker' },
  ],
  edgeSite: [
    async ({}, use) => {
      const fixture = await deployFixture('edge-site')
      await use(fixture)
    },
    { scope: 'worker' },
  ],
  classicServerlessSite: [
    async ({}, use) => {
      const fixture = await deployFixture('classic-serverless-site')
      await use(fixture)
    },
    { scope: 'worker' },
  ],
  classicEdgeSite: [
    async ({}, use) => {
      const fixture = await deployFixture('classic-edge-site')
      await use(fixture)
    },
    { scope: 'worker' },
  ],
  hydrogenViteSite: [
    async ({}, use) => {
      const fixture = await deployFixture('hydrogen-vite-site')
      await use(fixture)
    },
    { scope: 'worker' },
  ],
  hydrogenViteSiteNoEntrypoint: [
    async ({}, use) => {
      try {
        await deployFixture('hydrogen-vite-site-no-entrypoint')
        await use(null)
      } catch (err: unknown) {
        await use(err as Error)
      }
    },
    { scope: 'worker' },
  ],
  reactRouterServerlessSite: [
    async ({}, use) => {
      const fixture = await deployFixture('react-router-serverless-site')
      await use(fixture)
    },
    { scope: 'worker' },
  ],
  reactRouterWithV8Middleware: [
    async ({}, use) => {
      const fixture = await deployFixture('react-router-v8-middleware')
      await use(fixture)
    },
    { scope: 'worker' },
  ],
})
export { expect } from '@playwright/test'
