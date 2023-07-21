// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('node:fs')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('node:path')

function onBuild(options) {
  const {
    constants: { INTERNAL_EDGE_FUNCTIONS_SRC },
    netlifyConfig: { build },
  } = options
  const buildDir = path.join(build.publish, 'build')
  console.log('build dir', buildDir)
  console.log('Hydrogen server file', path.join(build.publish, '../dist/worker/index.js'))
  console.log('client build dir', path.join(build.publish, '../dist/client/build/'))

  fs.mkdirSync(INTERNAL_EDGE_FUNCTIONS_SRC, { recursive: true })
  fs.copyFileSync(
    path.join(build.publish, '../dist/worker/index.js'),
    path.join(INTERNAL_EDGE_FUNCTIONS_SRC, 'server.js'),
  )

  fs.mkdirSync(buildDir, { recursive: true })
  fs.cpSync(path.join(build.publish, '../dist/client/build/'), buildDir, { recursive: true })

  // eslint-disable-next-line no-console
  console.log(
    `Copying built Hydrogen/Remix project files for Netlify Edge Function bundling (Current directory: '${process.cwd()}').`,
  )
}

module.exports.onBuild = onBuild
