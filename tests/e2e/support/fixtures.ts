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
   * A Hydrogen site using React Router 7 and edge SSR
   *
   * NOTE: `PUBLIC_STORE_DOMAIN` and `SESSION_SECRET` are populated for this fixture
   */
  hydrogenReactRouterSite: Fixture

  /**
   * A React Router 7 site using origin SSR, Vite 6
   */
  reactRouterServerlessSite: Fixture
  /**
   * A React Router 7 site using edge SSR, Vite 6
   */
  reactRouterEdgeSite: Fixture
  /**
   * A React Router 7 site using origin SSR, Vite 7
   */
  reactRouterServerlessSiteRR7Vite7: Fixture
  /**
   * A React Router 7 site using edge SSR, Vite 7
   */
  reactRouterEdgeSiteRR7Vite7: Fixture
  /**
   * A React Router 7 site using origin SSR, Vite 8
   */
  reactRouterServerlessSiteRR7Vite8: Fixture
  /**
   * A React Router 7 site using edge SSR, Vite 8
   */
  reactRouterEdgeSiteRR7Vite8: Fixture
  /**
   * A React Router 8 site using origin SSR, Vite 7
   */
  reactRouterServerlessSiteV8: Fixture
  /**
   * A React Router 8 site using edge SSR, Vite 7
   */
  reactRouterEdgeSiteV8: Fixture
  /**
   * A React Router 8 site using origin SSR, Vite 8
   */
  reactRouterServerlessSiteV8Vite8: Fixture
  /**
   * A React Router 8 site using edge SSR, Vite 8
   */
  reactRouterEdgeSiteV8Vite8: Fixture
  /**
   * A React Router 7 site using origin SSR and opted in to the `future.v8_middleware` flag
   */
  reactRouterServerlessWithV8Middleware: Fixture
  /**
   * A React Router 7 site using edge SSR and opted in to the `future.v8_middleware` flag
   */
  reactRouterEdgeWithV8Middleware: Fixture
  /**
   * A React Router 7 site using edge SSR with a custom basename (/fr)
   */
  reactRouterEdgeWithBasepath: Fixture
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
  hydrogenViteSite: [
    async ({}, use) => {
      const fixture = await deployFixture('hydrogen-remix-vite-site')
      await use(fixture)
    },
    { scope: 'worker' },
  ],
  hydrogenViteSiteNoEntrypoint: [
    async ({}, use) => {
      try {
        await deployFixture('hydrogen-remix-vite-site-no-entrypoint')
        await use(null)
      } catch (err: unknown) {
        await use(err as Error)
      }
    },
    { scope: 'worker' },
  ],
  hydrogenReactRouterSite: [
    async ({}, use) => {
      const fixture = await deployFixture('hydrogen-react-router-site')
      await use(fixture)
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
  reactRouterEdgeSite: [
    async ({}, use) => {
      const fixture = await deployFixture('react-router-edge-site')
      await use(fixture)
    },
    { scope: 'worker' },
  ],
  reactRouterServerlessSiteRR7Vite7: [
    async ({}, use) => {
      const fixture = await deployFixture('react-router-serverless-site', { overrides: { vite: '^7.0.0' } })
      await use(fixture)
    },
    { scope: 'worker' },
  ],
  reactRouterEdgeSiteRR7Vite8: [
    async ({}, use) => {
      const fixture = await deployFixture('react-router-edge-site', { overrides: { vite: '^8.0.0' } })
      await use(fixture)
    },
    { scope: 'worker' },
  ],
  reactRouterServerlessSiteRR7Vite8: [
    async ({}, use) => {
      const fixture = await deployFixture('react-router-serverless-site', { overrides: { vite: '^8.0.0' } })
      await use(fixture)
    },
    { scope: 'worker' },
  ],
  reactRouterEdgeSiteRR7Vite7: [
    async ({}, use) => {
      const fixture = await deployFixture('react-router-edge-site', { overrides: { vite: '^7.0.0' } })
      await use(fixture)
    },
    { scope: 'worker' },
  ],
  reactRouterServerlessSiteV8: [
    async ({}, use) => {
      const fixture = await deployFixture('react-router-serverless-site-v8')
      await use(fixture)
    },
    { scope: 'worker' },
  ],
  reactRouterEdgeSiteV8: [
    async ({}, use) => {
      const fixture = await deployFixture('react-router-edge-site-v8')
      await use(fixture)
    },
    { scope: 'worker' },
  ],
  reactRouterServerlessSiteV8Vite8: [
    async ({}, use) => {
      const fixture = await deployFixture('react-router-serverless-site-v8', { overrides: { vite: '^8.0.0' } })
      await use(fixture)
    },
    { scope: 'worker' },
  ],
  reactRouterEdgeSiteV8Vite8: [
    async ({}, use) => {
      const fixture = await deployFixture('react-router-edge-site-v8', { overrides: { vite: '^8.0.0' } })
      await use(fixture)
    },
    { scope: 'worker' },
  ],
  reactRouterServerlessWithV8Middleware: [
    async ({}, use) => {
      const fixture = await deployFixture('react-router-serverless-v8-middleware')
      await use(fixture)
    },
    { scope: 'worker' },
  ],
  reactRouterEdgeWithV8Middleware: [
    async ({}, use) => {
      const fixture = await deployFixture('react-router-edge-v8-middleware')
      await use(fixture)
    },
    { scope: 'worker' },
  ],
  reactRouterEdgeWithBasepath: [
    async ({}, use) => {
      const fixture = await deployFixture('react-router-edge-basepath')
      await use(fixture)
    },
    { scope: 'worker' },
  ],
})
export { expect } from '@playwright/test'
