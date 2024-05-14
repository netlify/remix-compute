import { test as base } from '@playwright/test'

import { type Fixture, deployFixture } from './deploy-to-netlify'

/* eslint-disable-next-line @typescript-eslint/no-empty-interface */
interface TestFixtures {}
interface WorkerFixtures {
  serverlessSite: Fixture
  edgeSite: Fixture
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
})
export { expect } from '@playwright/test'
