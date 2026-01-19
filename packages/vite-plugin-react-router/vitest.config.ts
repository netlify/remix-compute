/// <reference types="vitest" />
/// <reference types="vite/client" />

import { defineProject } from 'vitest/config'

export default defineProject({
  plugins: [],
  test: {
    include: ['./__tests__/*.{js,jsx,tsx,ts}', './src/**/*.test.{js,jsx,tsx,ts}'],
    globals: true,
  },
})
