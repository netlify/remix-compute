import type { Plugin, ResolvedConfig } from 'vite'
import { mkdir, writeFile } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import { sep as posixSep } from 'node:path/posix'
import { version, name } from '../package.json'

const NETLIFY_FUNCTIONS_DIR = '.netlify/functions-internal'

const FUNCTION_FILENAME = 'remix-server.mjs'
/**
 * The chunk filename without an extension, i.e. in the Rollup config `input` format
 */
const FUNCTION_HANDLER_CHUNK = 'server'

const FUNCTION_HANDLER_MODULE_ID = 'virtual:netlify-server'
const RESOLVED_FUNCTION_HANDLER_MODULE_ID = `\0${FUNCTION_HANDLER_MODULE_ID}`

const toPosixPath = (path: string) => path.split(sep).join(posixSep)

// The virtual module that is the compiled Vite SSR entrypoint (a Netlify Function handler)
const FUNCTION_HANDLER = /* js */ `
import { createRequestHandler } from "@netlify/remix-adapter";
import * as build from "virtual:remix/server-build";
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
      name: "Remix server handler",
      generator: "${name}@${version}",
      path: "/*",
      preferStatic: true,
    };
    `
}

export function netlifyPlugin(): Plugin {
  let resolvedConfig: ResolvedConfig
  let currentCommand: string
  let isSsr: boolean | undefined
  return {
    name: 'vite-plugin-remix-netlify-functions',
    config(config, { command, isSsrBuild }) {
      currentCommand = command
      isSsr = isSsrBuild
      if (command === 'build') {
        if (isSsrBuild) {
          // We need to add an extra SSR entrypoint, as we need to compile
          // the server entrypoint too. This is because it uses virtual
          // modules.
          // NOTE: the below is making various assumptions about the Remix Vite plugin's
          // implementation details:
          // https://github.com/remix-run/remix/blob/cc65962b1a96d1e134336aa9620ef1dad7c5efb1/packages/remix-dev/vite/plugin.ts#L1149-L1168
          // TODO(serhalp) Stop making these assumptions or assert them explictly.
          // TODO(serhalp) Unless I'm misunderstanding something, we should only need to *replace*
          // the default Remix Vite SSR entrypoint, not add an additional one.
          if (typeof config.build?.rollupOptions?.input === 'string') {
            config.build.rollupOptions.input = {
              [FUNCTION_HANDLER_CHUNK]: FUNCTION_HANDLER_MODULE_ID,
              index: config.build.rollupOptions.input,
            }
            if (config.build.rollupOptions.output && !Array.isArray(config.build.rollupOptions.output)) {
              config.build.rollupOptions.output.entryFileNames = '[name].js'
            }
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
        return FUNCTION_HANDLER
      }
    },
    async configResolved(config) {
      resolvedConfig = config
    },
    // See https://rollupjs.org/plugin-development/#writebundle.
    async writeBundle() {
      // Write the server entrypoint to the Netlify functions directory
      if (currentCommand === 'build' && isSsr) {
        const functionsDirectory = join(resolvedConfig.root, NETLIFY_FUNCTIONS_DIR)

        await mkdir(functionsDirectory, { recursive: true })

        const handlerPath = join(resolvedConfig.build.outDir, `${FUNCTION_HANDLER_CHUNK}.js`)
        const relativeHandlerPath = toPosixPath(relative(functionsDirectory, handlerPath))

        await writeFile(join(functionsDirectory, FUNCTION_FILENAME), generateNetlifyFunction(relativeHandlerPath))
      }
    },
  }
}
