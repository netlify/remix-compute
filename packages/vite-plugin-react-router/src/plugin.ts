import type { Plugin, ResolvedConfig } from 'vite'
import { mkdir, writeFile, readdir } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import { sep as posixSep } from 'node:path/posix'
import { version, name } from '../package.json'

export interface NetlifyPluginOptions {
  /**
   * Deploy to Netlify Edge Functions instead of Netlify Functions.
   * @default false
   */
  edge?: boolean
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

const toPosixPath = (path: string) => path.split(sep).join(posixSep)

// The virtual module that is the compiled Vite SSR entrypoint (a Netlify Function handler)
const FUNCTION_HANDLER = /* js */ `
import { createRequestHandler } from "@netlify/vite-plugin-react-router/function-handler";
import * as build from "virtual:react-router/server-build";
export default createRequestHandler({
  build,
});
`

// The virtual module for Edge Functions
const EDGE_FUNCTION_HANDLER = /* js */ `
import { createRequestHandler } from "@netlify/vite-plugin-react-router/edge-function-handler";
import * as build from "virtual:react-router/server-build";
export default createRequestHandler({
  build,
});
`

// This is written to the functions directory. It just re-exports
// the compiled entrypoint, along with Netlify function config.
function generateNetlifyFunction(handlerPath: string) {
  return /* js */ `
    export { default } from "${handlerPath}";

    export const config = {
      name: "React Router server handler",
      generator: "${name}@${version}",
      path: "/*",
      preferStatic: true,
    };
    `
}

// This is written to the edge functions directory. It just re-exports
// the compiled entrypoint, along with Netlify edge function config.
function generateEdgeFunction(handlerPath: string, excludePath: Array<string> = []) {
  return /* js */ `
    export { default } from "${handlerPath}";

    export const config = {
      name: "React Router server handler",
      generator: "${name}@${version}",
      cache: "manual",
      path: "/*",
      excludedPath: ${JSON.stringify(excludePath)},
    };
    `
}

export function netlifyPlugin(options: NetlifyPluginOptions = {}): Plugin {
  const { edge = false } = options
  let resolvedConfig: ResolvedConfig
  let isProductionSsrBuild = false
  return {
    name: 'vite-plugin-netlify-react-router',
    config(config, { command, isSsrBuild }) {
      isProductionSsrBuild = isSsrBuild === true && command === 'build'
      if (isProductionSsrBuild) {
        // Replace the default SSR entrypoint with our own entrypoint (which is imported by our
        // Netlify function handler via a virtual module)
        config.build ??= {}
        config.build.rollupOptions ??= {}
        config.build.rollupOptions.input = {
          [FUNCTION_HANDLER_CHUNK]: FUNCTION_HANDLER_MODULE_ID,
        }
        config.build.rollupOptions.output ??= {}
        if (Array.isArray(config.build.rollupOptions.output)) {
          console.warn(
            'Expected Vite config `build.rollupOptions.output` to be an object, but it is an array - overwriting it, but this may cause issues with your custom configuration',
          )
          config.build.rollupOptions.output = {}
        }
        config.build.rollupOptions.output.entryFileNames = '[name].js'

        // Configure for Edge Functions if enabled
        if (edge) {
          config.ssr = {
            ...config.ssr,
            target: 'webworker',
            // Only externalize Node builtins
            noExternal: /^(?!node:).*$/,
            resolve: {
              conditions: ['worker', 'deno', 'browser'],
              externalConditions: ['worker', 'deno'],
            },
          }
          config.resolve = {
            ...config.resolve,
            conditions: ['worker', 'deno', ...(config.resolve?.conditions || [])],
          }
        }
      }
    },
    async resolveId(source) {
      if (source === FUNCTION_HANDLER_MODULE_ID) {
        return RESOLVED_FUNCTION_HANDLER_MODULE_ID
      }
    },
    // See https://vitejs.dev/guide/api-plugin#virtual-modules-convention.
    load(id) {
      if (id === RESOLVED_FUNCTION_HANDLER_MODULE_ID) {
        return edge ? EDGE_FUNCTION_HANDLER : FUNCTION_HANDLER
      }
    },
    async configResolved(config) {
      resolvedConfig = config
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
          const entries = await readdir(clientDir, { withFileTypes: true })
          const excludePath = [
            '/.netlify/*',
            ...entries.map((entry) => (entry.isDirectory() ? `/${entry.name}/*` : `/${entry.name}`)),
          ]

          // Write the server entry point to the Netlify Edge Functions directory
          const edgeFunctionsDir = join(resolvedConfig.root, NETLIFY_EDGE_FUNCTIONS_DIR)
          await mkdir(edgeFunctionsDir, { recursive: true })
          const relativeHandlerPath = toPosixPath(relative(edgeFunctionsDir, handlerPath))
          await writeFile(
            join(edgeFunctionsDir, FUNCTION_FILENAME),
            generateEdgeFunction(relativeHandlerPath, excludePath),
          )
        } else {
          // Write the server entry point to the Netlify Functions directory
          const functionsDir = join(resolvedConfig.root, NETLIFY_FUNCTIONS_DIR)
          await mkdir(functionsDir, { recursive: true })
          const relativeHandlerPath = toPosixPath(relative(functionsDir, handlerPath))
          await writeFile(join(functionsDir, FUNCTION_FILENAME), generateNetlifyFunction(relativeHandlerPath))
        }
      }
    },
  }
}
