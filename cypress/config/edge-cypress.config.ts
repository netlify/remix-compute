import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    specPattern: 'cypress/e2e/**/*.spec.ts',
    projectId: 'k847hv',
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
})
