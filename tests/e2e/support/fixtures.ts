import { test as base } from '@playwright/test'

import { type Fixture, deployFixture } from './deploy-to-netlify'

/* eslint-disable-next-line @typescript-eslint/no-empty-interface */
interface TestFixtures { }
interface WorkerFixtures {
  /**
   * A "classic" (non-Vite) Remix site using origin SSR
   */
  classicServerlessSite: Fixture
  /**
   * A "classic" (non-Vite) Remix site using edge SSR
   */
  classicEdgeSite: Fixture
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  classicServerlessSite: [
    async ({ }, use) => {
      const fixture = await deployFixture('classic-serverless-site')
      await use(fixture)
    },
    { scope: 'worker' },
  ],
  classicEdgeSite: [
    async ({ }, use) => {
      const fixture = await deployFixture('classic-edge-site')
      await use(fixture)
    },
    { scope: 'worker' },
  ],
})
export { expect } from '@playwright/test'
