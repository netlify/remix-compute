import type { Plugin, ResolvedConfig } from 'vite'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { version, name } from '../package.json'

const SERVER_ID = 'virtual:netlify-server'
const RESOLVED_SERVER_ID = `\0${SERVER_ID}`

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

let defaultEntryServer: string | undefined = undefined
let entryServerNetlifyDefault: string | undefined = undefined

try {
  const remixEntryPath = createRequire(import.meta.url).resolve('@remix-run/dev')
  defaultEntryServer = resolve(dirname(remixEntryPath), 'config', 'defaults', 'entry.server.node.tsx')
  const indexURL = new URL('./index.mjs', import.meta.url)
  entryServerNetlifyDefault = /* js */ `
  export { handleRequest as default } from '${indexURL.pathname}'
  `
} catch {
  // Ignore
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

      if (defaultEntryServer && entryServerNetlifyDefault && defaultEntryServer === id) {
        return entryServerNetlifyDefault
      }
    },
    async configResolved(config) {
      resolvedConfig = config
    },
    async writeBundle() {
      if (currentCommand === 'build' && isSsr) {
        // Write the server entrypoint to the Netlify functions directory
        const functionDir = join(resolvedConfig.root, '.netlify/functions-internal')
        await mkdir(functionDir, { recursive: true })
        await writeFile(
          join(functionDir, 'remix-server.mjs'),
          generateNetlifyFunction(relative(functionDir, join(resolvedConfig.build.outDir, 'server.js'))),
        )
      }
    },
  }
}
