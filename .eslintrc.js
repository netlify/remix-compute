const { overrides } = require('@netlify/eslint-config-node')

module.exports = {
  extends: '@netlify/eslint-config-node',
  rules: {
    'max-depth': 0,
    complexity: 0,
    'fp/no-let': 0,
    'fp/no-loops': 0,
    'fp/no-mutation': 0,
    'fp/no-mutating-methods': 0,
    'id-length': 0,
    'max-statements': 0,
    'no-await-in-loop': 0,
    'n/exports-style': 0,
    'n/global-require': 0,
    'n/prefer-global/process': 0,
    // Allow a single word inline so that it can do language tags for syntax highlighting
    // ['error', { ignorePattern: /^ (\w+) $/ }],
    'no-inline-comments': 0,
    'no-magic-numbers': 0,
    'no-param-reassign': 0,
    'no-promise-executor-return': 0,
    'no-prototype-builtins': 0,
    'no-unused-vars': 0,
    'prefer-regex-literals': 0,
    'promise/prefer-await-to-callbacks': 0,
    'unicorn/consistent-function-scoping': 0,
    'unicorn/filename-case': 0,
    'unicorn/no-array-push-push': 0,
    'unicorn/numeric-separators-style': 0,
    'max-lines': 0,
    // allow variables starting with Remix's unstable_
    camelcase: [
      'error',
      {
        allow: ['unstable_'],
      },
    ],
    // Not sure why vitest is considered an unpublished import so adding
    // it to the list of allowed modules
    'n/no-unpublished-import': [
      'error',
      {
        allowModules: ['vitest'],
      },
    ],
  },
  parserOptions: {
    sourceType: 'module',
  },
  overrides: [
    ...overrides,
    {
      files: ['**/*.ts'],
      rules: {
        '@typescript-eslint/no-extra-semi': 'off',
        'n/no-missing-import': 'off',
      },
    },
  ],
}
