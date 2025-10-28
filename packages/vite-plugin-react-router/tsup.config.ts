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
    entry: ['src/function-handler.ts'],
    format: ['esm'],
    dts: true,
    target: 'node18',
  },
  {
    entry: ['src/edge-function-handler.ts'],
    format: ['esm'],
    dts: true,
    target: 'node18',
  },
])
