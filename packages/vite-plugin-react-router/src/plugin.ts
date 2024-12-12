import type { Plugin, ResolvedConfig } from 'vite'
import { mkdir, writeFile } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import { sep as posixSep } from 'node:path/posix'
import { version, name } from '../package.json'

// https://docs.netlify.com/frameworks-api/#netlify-v1-functions
const NETLIFY_FUNCTIONS_DIR = '.netlify/v1/functions'

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
import { createRequestHandler } from "@netlify/vite-plugin-react-router";
import * as build from "virtual:react-router/server-build";
export default createRequestHandler({
  build,
  getLoadContext: async (_req, ctx) => ctx,
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

export function netlifyPlugin(): Plugin {
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
        return FUNCTION_HANDLER
      }
    },
    async configResolved(config) {
      resolvedConfig = config
    },
    // See https://rollupjs.org/plugin-development/#writebundle.
    async writeBundle() {
      // Write the server entrypoint to the Netlify functions directory
      if (isProductionSsrBuild) {
        const functionsDirectory = join(resolvedConfig.root, NETLIFY_FUNCTIONS_DIR)

        await mkdir(functionsDirectory, { recursive: true })

        const handlerPath = join(resolvedConfig.build.outDir, `${FUNCTION_HANDLER_CHUNK}.js`)
        const relativeHandlerPath = toPosixPath(relative(functionsDirectory, handlerPath))

        await writeFile(join(functionsDirectory, FUNCTION_FILENAME), generateNetlifyFunction(relativeHandlerPath))
      }
    },
  }
}
