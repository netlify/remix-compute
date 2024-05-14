import { overrides } from '@netlify/eslint-config-node/.eslintrc_esm'

module.exports = {
  root: true,
  extends: ['@netlify/eslint-config-node', 'plugin:playwright/recommended'],
  env: {
    browser: true,
    es2019: true,
    node: true,
  },
  overrides: { ...overrides },
}
