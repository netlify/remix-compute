import { defineConfig } from 'tsdown'

// `react`/`react-dom` are devDependencies, so tsdown won't auto-externalize them (it only does so
// for `dependencies`/`peerDependencies`). Keep them external so the runtime resolves the correct build.
const external = [/^react(-dom)?(\/.*)?$/]

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    serverless: 'src/runtimes/netlify-functions.ts',
    edge: 'src/runtimes/netlify-edge-functions.ts',
    'entry.server.edge': 'src/entry.server.edge.tsx',
  },
  format: ['esm'],
  dts: true,
  target: 'node22',
  external,
  // Derive extensions from the package's `type` (`.mjs`/`.d.mts` for ESM, `.js`/`.d.ts` for
  // CJS) instead of tsdown's fixed `.mjs`/`.cjs`, to match the paths in `exports`.
  fixedExtension: false,
})
