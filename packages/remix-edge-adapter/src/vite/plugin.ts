import type { Plugin, ResolvedConfig } from 'vite'
import { fromNodeRequest, toNodeRequest } from '@remix-run/dev/dist/vite/node-adapter.js'
import type { EdgeFunction, Context as NetlifyContext } from '@netlify/edge-functions'
import { writeFile, mkdir, readdir, access } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import { sep as posixSep } from 'node:path/posix'
import { isBuiltin } from 'node:module'
import { version, name } from '../../package.json'

const NETLIFY_EDGE_FUNCTIONS_DIR = '.netlify/edge-functions'

const EDGE_FUNCTION_FILENAME = 'remix-server.mjs'
/**
 * The chunk filename without an extension, i.e. in the Rollup config `input` format
 */
const EDGE_FUNCTION_HANDLER_CHUNK = 'server'

const EDGE_FUNCTION_HANDLER_MODULE_ID = 'virtual:netlify-server'
const RESOLVED_EDGE_FUNCTION_HANDLER_MODULE_ID = `\0${EDGE_FUNCTION_HANDLER_MODULE_ID}`

const toPosixPath = (path: string) => path.split(sep).join(posixSep)

const notImplemented = () => {
  throw new Error(`
This is a fake Netlify context object for local dev. It is not supported here, but it will work with
\`netlify serve\` and in a production build. To fix this, add it as custom context in your
\`createAppLoadContext\` conditionally in dev.
`)
}
const getFakeNetlifyContext = (url: string) =>
  ({
    url: new URL(url),
    requestId: 'fake-netlify-request-id-for-dev',
    next: async () => new Response('', { status: 404 }),
    geo: {
      city: 'Mock City',
      country: { code: 'MC', name: 'Mock Country' },
      subdivision: { code: 'MS', name: 'Mock Subdivision' },
      longitude: 0,
      latitude: 0,
      timezone: 'UTC',
    },
    get cookies() {
      return notImplemented()
    },
    get deploy() {
      return notImplemented()
    },
    get ip() {
      return notImplemented()
    },
    get json() {
      return notImplemented()
    },
    get log() {
      return notImplemented()
    },
    get params() {
      return notImplemented()
    },
    get rewrite() {
      return notImplemented()
    },
    get site() {
      return notImplemented()
    },
    get account() {
      return notImplemented()
    },
    get server() {
      return notImplemented()
    },
  }) as NetlifyContext

// The virtual module that is the compiled Vite SSR entrypoint (a Netlify Edge Function handler)
const EDGE_FUNCTION_HANDLER = /* js */ `
import { createRequestHandler } from "@netlify/remix-edge-adapter";
import * as build from "virtual:remix/server-build";

export default createRequestHandler({
  build,
  getLoadContext: async (_req, ctx) => ctx,
});
`

// This is written to the edge functions directory. It just re-exports
// the compiled entrypoint, along with the Netlify function config.
function generateEdgeFunction(handlerPath: string, excludedPath: Array<string>) {
  return /* js */ `
    export { default } from "${handlerPath}";

    export const config = {
      name: "Remix server handler",
      generator: "${name}@${version}",
      cache: "manual",
      path: "/*",
      excludedPath: ${JSON.stringify(excludedPath)},
    };`
}

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

const getEdgeFunctionHandlerModuleId = async (root: string, isHydrogenSite: boolean) => {
  if (!isHydrogenSite) return EDGE_FUNCTION_HANDLER_MODULE_ID
  return findUserEdgeFunctionHandlerFile(root)
}

export interface NetlifyPluginOptions {
  /**
   * Paths to exclude from being handled by the Remix handler.
   *
   * @IMPORTANT If you have your own Netlify Functions running on custom `path`s, you
   * must exclude those paths here to avoid conflicts.
   *
   * @type {string[]}
   * @default []
   */
  excludedPaths?: string[]
}

export function netlifyPlugin(options: NetlifyPluginOptions = {}): Plugin {
  const additionalExcludedPaths = options.excludedPaths ?? []
  let resolvedConfig: ResolvedConfig
  let currentCommand: string
  let isSsr: boolean | undefined
  let isHydrogenSite: boolean

  return {
    name: 'vite-plugin-remix-netlify-edge',
    config(config, { command, isSsrBuild }) {
      currentCommand = command
      isSsr = isSsrBuild
      if (command === 'build') {
        if (isSsrBuild) {
          // Configure for Netlify Edge Functions
          config.ssr = {
            ...config.ssr,
            target: 'webworker',
            // Only externalize Node builtins
            noExternal: /^(?!node:).*$/,
          }
        }
      }
    },
    configResolved: {
      order: 'pre',
      async handler(config) {
        resolvedConfig = config
        isHydrogenSite = resolvedConfig.plugins.find((plugin) => plugin.name === 'hydrogen:main') != null

        if (currentCommand === 'build' && isSsr) {
          // We need to add an extra entrypoint, as we need to compile
          // the server entrypoint too. This is because it uses virtual
          // modules. It also avoids the faff of dealing with npm modules in Deno.
          // NOTE: the below is making various assumptions about the Remix Vite plugin's
          // implementation details:
          // https://github.com/remix-run/remix/blob/cc65962b1a96d1e134336aa9620ef1dad7c5efb1/packages/remix-dev/vite/plugin.ts#L1149-L1168
          // TODO(serhalp) Stop making these assumptions or assert them explictly.
          // TODO(serhalp) Unless I'm misunderstanding something, we should only need to *replace*
          // the default Remix Vite SSR entrypoint, not add an additional one.
          if (typeof config.build?.rollupOptions?.input === 'string') {
            const edgeFunctionHandlerModuleId = await getEdgeFunctionHandlerModuleId(
              resolvedConfig.root,
              isHydrogenSite,
            )

            config.build.rollupOptions.input = {
              [EDGE_FUNCTION_HANDLER_CHUNK]: edgeFunctionHandlerModuleId,
              index: config.build.rollupOptions.input,
            }
            if (config.build.rollupOptions.output && !Array.isArray(config.build.rollupOptions.output)) {
              // NOTE: must use function syntax here to work around https://github.com/Shopify/hydrogen/issues/2496
              config.build.rollupOptions.output.entryFileNames = () => '[name].js'
            }
          }
        } else if (isHydrogenSite && currentCommand === 'serve') {
          // handle dev server and use user's server.ts as entrypoint
          // to later use it for handling requests within vite's dev server middleware
          config.build.ssr = await findUserEdgeFunctionHandlerFile(resolvedConfig.root)
        }
      },
    },

    resolveId: {
      order: 'pre',
      async handler(source, importer, options) {
        // Conditionally resolve the server entry based on the command.
        // The Vite dev server uses Node, so we use a different entrypoint
        if (source === 'virtual:netlify-server-entry') {
          if (currentCommand === 'build' && options.ssr) {
            // This is building for edge functions, so use our edge adapter
            return this.resolve('@netlify/remix-edge-adapter/entry.server', importer, {
              ...options,
              skipSelf: true,
            })
          } else {
            // This is building for the dev server, so use the Node adapter
            return this.resolve('@remix-run/dev/dist/config/defaults/entry.server.node', importer, {
              ...options,
              skipSelf: true,
            })
          }
        }
        // Our virtual entrypoint module. See
        // https://vitejs.dev/guide/api-plugin#virtual-modules-convention.
        if (source === EDGE_FUNCTION_HANDLER_MODULE_ID) {
          return RESOLVED_EDGE_FUNCTION_HANDLER_MODULE_ID
        }

        if (isSsr && isBuiltin(source)) {
          return {
            // Deno needs Node builtins to be prefixed
            id: source.startsWith('node:') ? source : `node:${source}`,
            external: true,
            moduleSideEffects: false,
          }
        }
        return null
      },
    },
    // See https://vitejs.dev/guide/api-plugin#virtual-modules-convention.
    load(id) {
      if (id === RESOLVED_EDGE_FUNCTION_HANDLER_MODULE_ID) {
        return EDGE_FUNCTION_HANDLER
      }
    },

    configureServer: {
      order: 'pre',
      handler(viteDevServer) {
        return () => {
          if (isHydrogenSite && !viteDevServer.config.server.middlewareMode) {
            viteDevServer.middlewares.use(async (nodeReq, nodeRes, next) => {
              try {
                const edgeFunctionHandlerModuleId = await findUserEdgeFunctionHandlerFile(resolvedConfig.root)
                let build = (await viteDevServer.ssrLoadModule(edgeFunctionHandlerModuleId)) as {
                  default: EdgeFunction
                }
                const handleRequest = build.default
                let req = fromNodeRequest(nodeReq, nodeRes)
                const res = await handleRequest(req, getFakeNetlifyContext(req.url))
                if (res instanceof Response) return await toNodeRequest(res, nodeRes)
                if (res instanceof URL) {
                  next(new Error('URLs are not supported in dev server middleware'))
                  return
                }
                next()
              } catch (error) {
                next(error)
              }
            })
          }
        }
      },
    },

    // See https://rollupjs.org/plugin-development/#writebundle.
    async writeBundle() {
      // Write the server entrypoint to the Netlify functions directory
      if (currentCommand === 'build' && isSsr) {
        const excludedPath: Array<string> = ['/.netlify/*']
        try {
          // Get the client files so we can skip them in the edge function
          const clientDirectory = join(resolvedConfig.build.outDir, '..', 'client')
          const entries = await readdir(clientDirectory, { withFileTypes: true })
          for (const entry of entries) {
            // With directories we don't bother to recurse into it and just skip the whole thing.
            if (entry.isDirectory()) {
              excludedPath.push(`/${entry.name}/*`)
            } else if (entry.isFile()) {
              excludedPath.push(`/${entry.name}`)
            }
          }
        } catch {
          // Ignore if it doesn't exist
        }

        excludedPath.push(...additionalExcludedPaths)

        const edgeFunctionsDirectory = join(resolvedConfig.root, NETLIFY_EDGE_FUNCTIONS_DIR)

        await mkdir(edgeFunctionsDirectory, { recursive: true })

        const handlerPath = join(resolvedConfig.build.outDir, `${EDGE_FUNCTION_HANDLER_CHUNK}.js`)
        const relativeHandlerPath = toPosixPath(relative(edgeFunctionsDirectory, handlerPath))

        await writeFile(
          join(edgeFunctionsDirectory, EDGE_FUNCTION_FILENAME),
          generateEdgeFunction(relativeHandlerPath, excludedPath),
        )
      }
    },
  }
}
