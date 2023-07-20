// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('node:fs')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('node:path')

function onBuild(options) {
  const { PUBLISH_DIR, INTERNAL_EDGE_FUNCTIONS_SRC } = options.constants
  const buildDir = path.join(PUBLISH_DIR, 'build')

  fs.mkdirSync(INTERNAL_EDGE_FUNCTIONS_SRC, { recursive: true })
  fs.copyFileSync('./dist/worker/index.js', path.join(INTERNAL_EDGE_FUNCTIONS_SRC, 'server.js'))

  fs.mkdirSync(buildDir, { recursive: true })
  fs.cpSync('./dist/client/build/', buildDir, { recursive: true })

  // eslint-disable-next-line no-console
  console.log(
    `Copying built Hydrogen/Remix project files for Netlify Edge Function bundling (Current directory: '${process.cwd()}').`,
  )
}

module.exports.onBuild = onBuild
