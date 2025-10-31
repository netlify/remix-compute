import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    target: 'node18',
    clean: true,
  },
  {
    entry: { serverless: 'src/runtimes/netlify-functions.ts', edge: 'src/runtimes/netlify-edge-functions.ts' },
    format: ['esm'],
    dts: true,
    target: 'node18',
  },
])
