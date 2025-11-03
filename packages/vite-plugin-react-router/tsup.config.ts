import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: {
      index: 'src/index.ts',
      serverless: 'src/runtimes/netlify-functions.ts',
      edge: 'src/runtimes/netlify-edge-functions.ts',
    },
    format: ['esm'],
    dts: true,
    target: 'node18',
    // Can't use `clean: true` because of this bug: https://github.com/egoist/tsup/issues/670.
    // TODO(serhalp): Switch to tsdown; tsup is no longer maintained anyway.
    clean: false,
  },
  // TODO(serhalp): Remove in a future major version.
  {
    entry: ['src/index.ts'],
    format: ['cjs'],
    dts: true,
    target: 'node18',
    clean: false,
  },
])
