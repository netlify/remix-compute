import type { Plugin, ResolvedConfig } from 'vite'
import { writeFile, mkdir, readdir, access } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import { sep as posixSep } from 'node:path/posix'
import { version, name } from '../../package.json'
import { isBuiltin } from 'node:module'

// FIXME: probably better to copy it and not rely on deep import of the Remix package
// if we go with this approach
import { toNodeRequest, fromNodeRequest } from '@remix-run/dev/dist/vite/node-adapter.js'

const NETLIFY_EDGE_FUNCTIONS_DIR = '.netlify/edge-functions'

const EDGE_FUNCTION_FILENAME = 'remix-server.mjs'
/**
 * The chunk filename without an extension, i.e. in the Rollup config `input` format
 */
const EDGE_FUNCTION_HANDLER_CHUNK = 'server'

const EDGE_FUNCTION_HANDLER_MODULE_ID = 'virtual:netlify-server'
const RESOLVED_EDGE_FUNCTION_HANDLER_MODULE_ID = `\0${EDGE_FUNCTION_HANDLER_MODULE_ID}`

const toPosixPath = (path: string) => path.split(sep).join(posixSep)

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
function generateEdgeFunction(handlerPath: string, exclude: Array<string> = []) {
  return /* js */ `
    export { default } from "${handlerPath}";

    export const config = {
      name: "Remix server handler",
      generator: "${name}@${version}",
      cache: "manual",
      path: "/*",
      excludedPath: ${JSON.stringify(exclude)},
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

export function netlifyPlugin(): Plugin {
  let resolvedConfig: ResolvedConfig
  let currentCommand: string
  let isSsr: boolean | undefined
  let isHydrogenSite: boolean | undefined

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
              config.build.rollupOptions.output.entryFileNames = '[name].js'
            }
          }
        }
        // FIXME: this is certainly not correct and now I'm not exactly sure what conditions to use here
        else if (isHydrogenSite) {
          config.build.ssr = await findUserEdgeFunctionHandlerFile(resolvedConfig.root)
        }
      },
    },
    configureServer: {
      order: 'pre',
      handler: (viteDevServer) => {
        if (isHydrogenSite) {
          // @ts-ignore common/server.ts uses Netlify global, would be good to get out of the need for it if possible
          // or alternatively figure out proper way to generate it. We also are current running in Node, not Deno so quite a lot of questions here
          globalThis.Netlify = {
            // @ts-ignore FIXME env Object is not complete and only implements the only method we do use
            env: {
              toObject: () => process.env,
            },
          }

          // returning a function here so the middleware is run after Vite's internal middleware
          // see https://vitejs.dev/guide/api-plugin#configureserver
          return () => {
            if (!viteDevServer.config.server.middlewareMode) {
              viteDevServer.middlewares.use(async (req, res, next) => {
                try {
                  let build = await viteDevServer.ssrLoadModule(
                    await findUserEdgeFunctionHandlerFile(resolvedConfig.root),
                  )
                  let request = fromNodeRequest(req)
                  const response: Response = await build.default(
                    request,
                    // this is Netlify's Edge Function context object (well not really)
                    {
                      next: () => next(),
                    },
                  )

                  if (response) {
                    await toNodeRequest(response, res)
                  } else {
                    next()
                  }
                } catch (error) {
                  next(error)
                }
              })
            }
          }
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
    // See https://rollupjs.org/plugin-development/#writebundle.
    async writeBundle() {
      // Write the server entrypoint to the Netlify functions directory
      if (currentCommand === 'build' && isSsr) {
        const exclude: Array<string> = ['/.netlify/*']
        try {
          // Get the client files so we can skip them in the edge function
          const clientDirectory = join(resolvedConfig.build.outDir, '..', 'client')
          const entries = await readdir(clientDirectory, { withFileTypes: true })
          for (const entry of entries) {
            // With directories we don't bother to recurse into it and just skip the whole thing.
            if (entry.isDirectory()) {
              exclude.push(`/${entry.name}/*`)
            } else if (entry.isFile()) {
              exclude.push(`/${entry.name}`)
            }
          }
        } catch {
          // Ignore if it doesn't exist
        }

        const edgeFunctionsDirectory = join(resolvedConfig.root, NETLIFY_EDGE_FUNCTIONS_DIR)

        await mkdir(edgeFunctionsDirectory, { recursive: true })

        const handlerPath = join(resolvedConfig.build.outDir, `${EDGE_FUNCTION_HANDLER_CHUNK}.js`)
        const relativeHandlerPath = toPosixPath(relative(edgeFunctionsDirectory, handlerPath))

        await writeFile(
          join(edgeFunctionsDirectory, EDGE_FUNCTION_FILENAME),
          generateEdgeFunction(relativeHandlerPath, exclude),
        )
      }
    },
  }
}
