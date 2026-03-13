import { access, mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { sep as posixSep } from 'node:path/posix'

import netlifyVitePlugin from '@netlify/vite-plugin'
import { createRequest, sendResponse } from '@remix-run/node-fetch-server'
import type { Plugin, ResolvedConfig } from 'vite'
import { glob } from 'tinyglobby'

import { version, name } from '../package.json'
import { mergeRollupInput } from './lib/rollup'

export interface NetlifyPluginOptions {
  /**
   * Deploy to Netlify Edge Functions instead of Netlify Functions.
   * @default false
   */
  edge?: boolean
  /**
   * Paths to exclude from being handled by the React Router handler.
   *
   * @IMPORTANT If you have opted in to edge rendering with `edge: true` and you have your own Netlify
   * Functions running on custom `path`s, you must exclude those paths here to avoid conflicts.
   *
   * @type {URLPattern[]}
   * @default []
   */
  excludedPaths?: string[]
}

// https://docs.netlify.com/frameworks-api/#netlify-v1-functions
const NETLIFY_FUNCTIONS_DIR = '.netlify/v1/functions'
// https://docs.netlify.com/frameworks-api/#netlify-v1-edge-functions
const NETLIFY_EDGE_FUNCTIONS_DIR = '.netlify/v1/edge-functions'

const FUNCTION_FILENAME = 'react-router-server.mjs'
/**
 * The chunk filename without an extension, i.e. in the Rollup config `input` format
 */
const FUNCTION_HANDLER_CHUNK = 'server'

const FUNCTION_HANDLER_MODULE_ID = 'virtual:netlify-server'
const RESOLVED_FUNCTION_HANDLER_MODULE_ID = `\0${FUNCTION_HANDLER_MODULE_ID}`

const SERVER_ENTRY_MODULE_ID = 'virtual:netlify-server-entry'

const toPosixPath = (path: string) => path.split(sep).join(posixSep)

// Note: these are checked in order. The first match is used.
const ALLOWED_USER_EDGE_FUNCTION_HANDLER_FILENAMES = [
  'server.ts',
  'server.mts',
  'server.cts',
  'server.mjs',
  'server.cjs',
  'server.js',
]

const findUserEdgeFunctionHandlerFile = async (root: string) => {
  for (const filename of ALLOWED_USER_EDGE_FUNCTION_HANDLER_FILENAMES) {
    try {
      await access(join(root, filename))
      return filename
    } catch {}
  }

  throw new Error(
    'Your Hydrogen site must include a `server.ts` (or js/mjs/cjs/mts/cts) file at the root to deploy to Netlify. See https://github.com/netlify/hydrogen-template.',
  )
}

// The virtual module that is the compiled Vite SSR entrypoint (a Netlify Function handler)
const FUNCTION_HANDLER = /* js */ `
import { createRequestHandler } from "@netlify/vite-plugin-react-router/serverless";
import * as build from "virtual:react-router/server-build";
export default createRequestHandler({
  build,
});
`

// The virtual module for Edge Functions
const EDGE_FUNCTION_HANDLER = /* js */ `
import { createRequestHandler } from "@netlify/vite-plugin-react-router/edge";
import * as build from "virtual:react-router/server-build";
export default createRequestHandler({
  build,
});
`

// This is written to the functions directory. It just re-exports
// the compiled entrypoint, along with Netlify function config.
function generateNetlifyFunction(handlerPath: string, excludedPath: Array<string>) {
  return /* js */ `
    export { default } from "${handlerPath}";

    export const config = {
      name: "React Router server handler",
      generator: "${name}@${version}",
      path: "/*",
      excludedPath: ${JSON.stringify(excludedPath)},
      preferStatic: true,
    };
    `
}

// This is written to the edge functions directory. It just re-exports
// the compiled entrypoint, along with Netlify edge function config.
function generateEdgeFunction(handlerPath: string, excludedPath: Array<string>) {
  return /* js */ `
    export { default } from "${handlerPath}";

    export const config = {
      name: "React Router server handler",
      generator: "${name}@${version}",
      cache: "manual",
      path: "/*",
      excludedPath: ${JSON.stringify(excludedPath)},
    };
    `
}

export function netlifyPlugin(options: NetlifyPluginOptions = {}): Plugin[] {
  const edge = options.edge ?? false
  const additionalExcludedPaths = options.excludedPaths ?? []
  let resolvedConfig: ResolvedConfig
  let isProductionSsrBuild = false
  let currentCommand: 'build' | 'serve' | undefined
  let isHydrogenSite = false
  let userServerFile: string | undefined

  const reactRouterPlugin: Plugin = {
    name: 'vite-plugin-netlify-react-router',
    config(_config, { command, isSsrBuild }) {
      currentCommand = command
      isProductionSsrBuild = isSsrBuild === true && command === 'build'

      if (isProductionSsrBuild) {
        // Server bundle entry for our own server entry point (which is imported by our Netlify
        // function handler via a virtual module), while preserving any existing rollup input
        // entries (e.g., from react-router's prerender).
        const functionHandlerInput = {
          [FUNCTION_HANDLER_CHUNK]: FUNCTION_HANDLER_MODULE_ID,
        }
        // We use `mergeRollupInput` because Vite (even with `mergeConfig`) doesn't handle
        // cross-type merging for `rollupOptions.input` (string/array/object).
        const mergedInput = mergeRollupInput(_config.build?.rollupOptions?.input, functionHandlerInput)

        const configChanges = {
          build: {
            rollupOptions: {
              input: mergedInput,
              output: {
                // NOTE: must use function syntax here to work around Shopify CLI reading
                // the config value literally (i.e. trying to stat `[name].js` as a filename).
                entryFileNames: () => '[name].js',
              },
            },
          },
          // Additional config needed for Edge Functions if enabled
          ...(edge
            ? {
                ssr: {
                  target: 'webworker' as const,
                  // Bundle everything except Node.js built-ins (which are supported but must use the `node:` prefix):
                  // https://docs.netlify.com/build/edge-functions/api/#runtime-environment
                  noExternal: /^(?!node:).*$/,
                  resolve: {
                    conditions: ['worker', 'deno', 'browser'],
                  },
                },
              }
            : {}),
        }

        return configChanges
      }
    },
    async resolveId(source, importer, options) {
      // Hydrogen sites provide their own server entry (server.ts) and entry.server.tsx,
      // so we skip resolution of our virtual modules.
      if (isHydrogenSite && edge) {
        if (source === FUNCTION_HANDLER_MODULE_ID || source === SERVER_ENTRY_MODULE_ID) {
          return
        }
      }

      if (source === FUNCTION_HANDLER_MODULE_ID) {
        return RESOLVED_FUNCTION_HANDLER_MODULE_ID
      }

      // Conditionally resolve the server entry based on the command and runtime.
      // Users will export from 'virtual:netlify-server-entry' in their `app/entry.server.tsx`
      //
      if (source === SERVER_ENTRY_MODULE_ID && edge) {
        if (currentCommand === 'serve') {
          // Dev mode with edge runtime: use the default Node.js-compatible entry
          const reactRouterDev = await this.resolve('@react-router/dev/config', importer, options)
          if (!reactRouterDev) {
            throw new Error('The @react-router/dev package is required for local development. Please install it.')
          }
          return resolve(dirname(reactRouterDev.id), 'config/defaults/entry.server.node.tsx')
        }
        // Production build with edge runtime: use our edge-compatible entry
        return this.resolve('@netlify/vite-plugin-react-router/entry.server.edge', importer, options)
      }
    },
    // See https://vitejs.dev/guide/api-plugin#virtual-modules-convention.
    load(id) {
      if (id === RESOLVED_FUNCTION_HANDLER_MODULE_ID) {
        return edge ? EDGE_FUNCTION_HANDLER : FUNCTION_HANDLER
      }
    },
    configResolved: {
      order: 'pre',
      async handler(config) {
        resolvedConfig = config
        isHydrogenSite = config.plugins.some((plugin) => plugin.name === 'hydrogen:main')

        if (isHydrogenSite && edge) {
          // Hydrogen sites use their own server.ts as the SSR entry.
          userServerFile = await findUserEdgeFunctionHandlerFile(config.root)

          if (isProductionSsrBuild) {
            if (
              config.build?.rollupOptions?.input &&
              typeof config.build.rollupOptions.input === 'object' &&
              !Array.isArray(config.build.rollupOptions.input)
            ) {
              config.build.rollupOptions.input[FUNCTION_HANDLER_CHUNK] = userServerFile
            }
          }
        }
      },
    },
    // In dev, Hydrogen sites need their server.ts to be loaded and called for each request so that
    // it can provide `getLoadContext` (storefront, cart, session, etc.) to React Router's request
    // handler. Without this, React Router's dev middleware would handle SSR with no load context.
    configureServer: {
      order: 'pre',
      handler(viteDevServer) {
        if (!isHydrogenSite || !edge) return

        if (!userServerFile) {
          viteDevServer.config.logger.warn(
            'Hydrogen site detected but no server.ts found. Dev SSR will fall through to React Router defaults.',
          )
          return
        }

        const serverEntryFile = userServerFile

        // Return a function to register as a post-middleware (runs after static file serving).
        // Using `order: 'pre'` ensures this runs before React Router's own SSR post-middleware.
        return () => {
          viteDevServer.middlewares.use(async (req, res, next) => {
            try {
              const serverModule = await viteDevServer.ssrLoadModule(join(viteDevServer.config.root, serverEntryFile))
              const handler = serverModule.default

              // Match what React Router's own dev middleware does
              req.url = req.originalUrl ?? req.url
              const request = createRequest(req, res)

              // `@netlify/vite-plugin` sets `globalThis.Netlify` in dev, including `.context`
              // (geo, ip, cookies, etc.) and `.env`. Pass it to the user's server handler so it
              // matches the edge function contract. The `netlifyRouterContext` Proxy from context.ts
              // also reads from this global, giving loaders access to `context.geo`, etc.
              // `waitUntil` is only available in the real edge function runtime, so we provide a
              // no-op fallback for dev.
              const netlifyContext = { waitUntil: () => {}, ...globalThis.Netlify?.context }
              const response = await handler(request, netlifyContext)

              if (response) {
                await sendResponse(res, response)
              } else {
                next()
              }
            } catch (error) {
              next(error)
            }
          })
        }
      },
    },
    // See https://rollupjs.org/plugin-development/#writebundle.
    async writeBundle() {
      if (isProductionSsrBuild) {
        const handlerPath = join(resolvedConfig.build.outDir, `${FUNCTION_HANDLER_CHUNK}.js`)

        if (edge) {
          // Edge Functions do not have a `preferStatic` option, so we must exhaustively exclude
          // static files to serve them from the CDN without compute.
          // RR7's build out dir contains /server and /client subdirectories. This is documented and
          // not configurable, so the client out dir is always at ../client from the server out dir.
          const clientDir = join(resolvedConfig.build.outDir, '..', 'client')
          const clientFiles = await glob('**/*', {
            cwd: clientDir,
            // We can't exclude entire directories because there could be `foo/bar.baz` in the
            // client dir and a `/foo` route handled by the server function.
            onlyFiles: true,
            dot: true,
          })
          const excludedPath = ['/.netlify/*', ...clientFiles.map((file) => `/${file}`), ...additionalExcludedPaths]

          // Write the server entry point to the Netlify Edge Functions directory
          const edgeFunctionsDir = join(resolvedConfig.root, NETLIFY_EDGE_FUNCTIONS_DIR)
          await mkdir(edgeFunctionsDir, { recursive: true })
          const relativeHandlerPath = toPosixPath(relative(edgeFunctionsDir, handlerPath))
          await writeFile(
            join(edgeFunctionsDir, FUNCTION_FILENAME),
            generateEdgeFunction(relativeHandlerPath, excludedPath),
          )
        } else {
          // Write the server entry point to the Netlify Functions directory
          const functionsDir = join(resolvedConfig.root, NETLIFY_FUNCTIONS_DIR)
          await mkdir(functionsDir, { recursive: true })
          const relativeHandlerPath = toPosixPath(relative(functionsDir, handlerPath))
          const excludedPath = ['/.netlify/*', ...additionalExcludedPaths]
          await writeFile(
            join(functionsDir, FUNCTION_FILENAME),
            generateNetlifyFunction(relativeHandlerPath, excludedPath),
          )
        }
      }
    },
  }

  return [reactRouterPlugin, ...netlifyVitePlugin()]
}
