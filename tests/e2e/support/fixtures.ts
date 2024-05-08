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
      // Set up the fixture
      const fixture = await deployFixture('serverless-site')
      // Use the fixture value in the test
      await use(fixture)
      // Cleanup goes here
    },
    { scope: 'worker' },
  ],
  edgeSite: [
    async ({}, use) => {
      // Set up the fixture
      const fixture = await deployFixture('edge-site')
      // Use the fixture value in the test
      await use(fixture)
      // Cleanup goes here
    },
    { scope: 'worker' },
  ],
})
export { expect } from '@playwright/test'
