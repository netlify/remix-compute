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
    clean: true,
  },
  // TODO(serhalp): Remove in a future major version.
  {
    entry: ['src/index.ts'],
    format: ['cjs'],
    dts: true,
    target: 'node18',
  },
])
