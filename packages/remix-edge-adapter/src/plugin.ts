import type { Plugin, ResolvedConfig } from 'vite'
import { writeFile, mkdir, readdir } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import { sep as posixSep } from 'node:path/posix'
import { version, name } from '../package.json'

const SERVER_ID = 'virtual:netlify-server'
const RESOLVED_SERVER_ID = `\0${SERVER_ID}`

const toPosixPath = (path: string) => path.split(sep).join(posixSep)

// The virtual module that is the compiled server entrypoint.
const serverCode = /* js */ `
import { createRequestHandler } from "@netlify/remix-edge-adapter";
import * as build from "virtual:remix/server-build";
export default createRequestHandler({ build });
`

// This is written to the edge functions directory. It just re-exports
// the compiled entrypoint, along with the Netlify function config.
function generateEntrypoint(server: string, exclude: Array<string> = []) {
  return /* js */ `
    export { default } from "${server}";
    export const config = {
      name: "Remix server handler",
      generator: "${name}@${version}",
      cache: "manual",
      path: "/*",
      excludedPath: ${JSON.stringify(exclude)},
    };`
}

export function netlifyPlugin(): Plugin {
  let resolvedConfig: ResolvedConfig
  let currentCommand: string
  let isSsr: boolean | undefined

  return {
    name: 'vite-plugin-remix-netlify-edge',
    config(config, { command, isSsrBuild }) {
      currentCommand = command
      isSsr = isSsrBuild
      if (command === 'build') {
        if (isSsrBuild) {
          // Configure for edge functions
          config.ssr = {
            ...config.ssr,
            target: 'webworker',
            noExternal: true,
          }
          // We need to add an extra entrypoint, as we need to compile
          // the server entrypoint too. This is because it uses virtual
          // modules. It also avoids the faff of dealing with npm modules
          // in Deno.
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
    async configResolved(config) {
      resolvedConfig = config
    },
    async resolveId(source, importer, options) {
      // Conditionally resolve the server entry based on the command.
      // The Vite dev server uses Node, so we use a different entrypoint
      if (source === 'virtual:netlify-server-entry') {
        if (currentCommand === 'build' && options.ssr) {
          // This is building for edge functions, so use the edge adapter
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
      // Our virtual entrypoint module
      if (source === SERVER_ID) {
        return RESOLVED_SERVER_ID
      }
      return null
    },
    load(id) {
      if (id === RESOLVED_SERVER_ID) {
        return serverCode
      }
    },
    async writeBundle() {
      // Write the server entrypoint to the Netlify functions directory
      if (currentCommand === 'build' && isSsr) {
        const exclude: Array<string> = []
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

        const edgeFunctionsDirectory = join(resolvedConfig.root, '.netlify/edge-functions')

        await mkdir(edgeFunctionsDirectory, { recursive: true })

        const serverPath = join(resolvedConfig.build.outDir, 'server.js')
        const relativeServerPath = toPosixPath(relative(edgeFunctionsDirectory, serverPath))

        await writeFile(
          join(edgeFunctionsDirectory, 'remix-server.mjs'),
          generateEntrypoint(relativeServerPath, exclude),
        )
      }
    },
  }
}
