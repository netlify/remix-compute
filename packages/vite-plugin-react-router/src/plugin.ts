import { access, mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { sep as posixSep } from 'node:path/posix'

import { createRequest, sendResponse } from '@remix-run/node-fetch-server'
import type { Plugin, ResolvedConfig, Rollup } from 'vite'
import { glob } from 'tinyglobby'

import { version, name } from '../package.json'

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

/**
 * Find React Router's single built server entry chunk and return its on-disk path.
 * This assumes that there is exactly one, which we happen to know to be true... except
 * when the user uses the `serverBundles` feature, which we do not support.
 * (See https://github.com/vitejs/vite/discussions/22507.)
 */
const findServerEntryFile = (bundle: Rollup.OutputBundle, outDir: string): string => {
  const entryChunks = Object.values(bundle).filter(
    (chunk): chunk is Rollup.OutputChunk => chunk.type === 'chunk' && chunk.isEntry,
  )
  if (entryChunks.length !== 1) {
    throw new Error(`Expected exactly one entry chunk in the React Router server build, found ${entryChunks.length}.`)
  }
  return join(outDir, entryChunks[0].fileName)
}

// The handler body: Hydrogen sites build their own `server.ts` whose default export is already a
// request handler, so we re-export it; otherwise we wrap React Router's server build.
function generateHandler(handlerPath: string, { edge, isHydrogen }: { edge: boolean; isHydrogen: boolean }) {
  return isHydrogen
    ? /* js */ `export { default } from "${handlerPath}";`
    : /* js */ `import { createRequestHandler } from "@netlify/vite-plugin-react-router/${edge ? 'edge' : 'serverless'}";
    import * as build from "${handlerPath}";
    export default createRequestHandler({ build });`
}

// This is written to the functions directory: the server handler, along with Netlify function config.
function generateNetlifyFunction(handlerPath: string, excludedPath: Array<string>, isHydrogen: boolean) {
  return /* js */ `
    ${generateHandler(handlerPath, { edge: false, isHydrogen })}

    export const config = {
      name: "React Router server handler",
      generator: "${name}@${version}",
      path: "/*",
      excludedPath: ${JSON.stringify(excludedPath)},
      preferStatic: true,
    };
    `
}

// This is written to the edge functions directory: the server handler, along with Netlify edge function config.
function generateEdgeFunction(handlerPath: string, excludedPath: Array<string>, isHydrogen: boolean) {
  return /* js */ `
    ${generateHandler(handlerPath, { edge: true, isHydrogen })}

    export const config = {
      name: "React Router server handler",
      generator: "${name}@${version}",
      cache: "manual",
      path: "/*",
      excludedPath: ${JSON.stringify(excludedPath)},
    };
    `
}

export function netlifyPlugin(options: NetlifyPluginOptions = {}): Plugin {
  const edge = options.edge ?? false
  const additionalExcludedPaths = options.excludedPaths ?? []
  let resolvedConfig: ResolvedConfig
  let currentCommand: 'build' | 'serve' | undefined
  let isHydrogenSite = false
  let userServerFile: string | undefined

  return {
    name: 'vite-plugin-netlify-react-router',
    applyToEnvironment: (environment) => environment.name === 'ssr',
    config(_config, { command }) {
      currentCommand = command

      if (edge && command === 'build') {
        return {
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
      }
    },
    async resolveId(source, importer, options) {
      // Conditionally resolve the server entry based on the command and runtime.
      // Users will export from 'virtual:netlify-server-entry' in their `app/entry.server.tsx`.
      // Hydrogen sites provide their own server entry, so we skip this swap for them.
      if (source === SERVER_ENTRY_MODULE_ID && edge && !isHydrogenSite) {
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
    configResolved: {
      order: 'pre',
      async handler(config) {
        resolvedConfig = config
        isHydrogenSite = config.plugins.some((plugin) => plugin.name === 'hydrogen:main')

        if (isHydrogenSite && edge) {
          // Hydrogen sites use their own server.ts as the SSR entry; fail early (with an actionable
          // message) if it's missing. It's also used by the dev middleware below.
          userServerFile = await findUserEdgeFunctionHandlerFile(config.root)
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
    // `applyToEnvironment` scopes this to the (production) SSR build.
    async writeBundle(_options, bundle) {
      const ssrOutDir = resolve(resolvedConfig.root, this.environment.config.build.outDir)
      const handlerPath = findServerEntryFile(bundle, ssrOutDir)

      if (edge) {
        // Edge Functions do not have a `preferStatic` option, so we must exhaustively exclude
        // static files to serve them from the CDN without compute.
        // RR's build out dir contains /server and /client subdirectories. This is documented and
        // not configurable, so the client out dir is always at ../client from the server out dir.
        const clientDir = join(ssrOutDir, '..', 'client')
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
          generateEdgeFunction(relativeHandlerPath, excludedPath, isHydrogenSite),
        )
      } else {
        // Write the server entry point to the Netlify Functions directory
        const functionsDir = join(resolvedConfig.root, NETLIFY_FUNCTIONS_DIR)
        await mkdir(functionsDir, { recursive: true })
        const relativeHandlerPath = toPosixPath(relative(functionsDir, handlerPath))
        const excludedPath = ['/.netlify/*', ...additionalExcludedPaths]
        await writeFile(
          join(functionsDir, FUNCTION_FILENAME),
          generateNetlifyFunction(relativeHandlerPath, excludedPath, isHydrogenSite),
        )
      }
    },
  }
}
