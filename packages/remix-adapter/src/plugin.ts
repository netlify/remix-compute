import type { Plugin, ResolvedConfig } from 'vite'
import { mkdir, writeFile } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import { sep as posixSep } from 'node:path/posix'
import { version, name } from '../package.json'

const SERVER_ID = 'virtual:netlify-server'
const RESOLVED_SERVER_ID = `\0${SERVER_ID}`

const toPosixPath = (path: string) => path.split(sep).join(posixSep)

// The virtual module that is the compiled server entrypoint.
const serverCode = /* js */ `
import { createRequestHandler } from "@netlify/remix-adapter";
import * as build from "virtual:remix/server-build";
export default createRequestHandler({ build });
`

// This is written to the functions directory. It just re-exports
// the compiled entrypoint, along with Netlify function config.
function generateNetlifyFunction(server: string) {
  return /* js */ `
    export { default } from "${server}";
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
          // We need to add an extra entrypoint, as we need to compile
          // the server entrypoint too. This is because it uses virtual
          // modules.
          if (typeof config.build?.rollupOptions?.input === 'string') {
            config.build.rollupOptions.input = {
              server: SERVER_ID,
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
      if (source === SERVER_ID) {
        return RESOLVED_SERVER_ID
      }
    },
    load(id) {
      if (id === RESOLVED_SERVER_ID) {
        return serverCode
      }
    },
    async configResolved(config) {
      resolvedConfig = config
    },
    async writeBundle() {
      // Write the server entrypoint to the Netlify functions directory
      if (currentCommand === 'build' && isSsr) {
        const functionsDirectory = join(resolvedConfig.root, '.netlify/functions-internal')

        await mkdir(functionsDirectory, { recursive: true })

        const serverPath = join(resolvedConfig.build.outDir, 'server.js')
        const relativeServerPath = toPosixPath(relative(functionsDirectory, serverPath))

        await writeFile(join(functionsDirectory, 'remix-server.mjs'), generateNetlifyFunction(relativeServerPath))
      }
    },
  }
}
