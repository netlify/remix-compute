// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('node:fs')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('node:path')

function onBuild(options) {
  const {
    constants: { INTERNAL_EDGE_FUNCTIONS_SRC },
    netlifyConfig: { build },
  } = options
  const buildDir = 'build'
  // Check to see if the path exists. Currently with the monorepo support, the current
  // working directory is different than when a deploy runs via git push.
  // e.g. local build cwd: /Users/u/repos/remix-compute/packages/hydrogen-demo-site/packages/hydrogen-demo-site/public
  // vs.
  // e.g. deploy cwd: /opt/build/repo/packages/hydrogen-demo-site/public
  const publishDir = fs.existsSync(build.publish) ? build.publish : 'public'
  const edgeFunctionsDir = path.join(process.cwd(), INTERNAL_EDGE_FUNCTIONS_SRC)

  fs.mkdirSync(edgeFunctionsDir, { recursive: true })
  fs.copyFileSync(path.join(publishDir, '../dist/worker/index.js'), path.join(edgeFunctionsDir, 'server.js'))

  fs.mkdirSync(buildDir, { recursive: true })
  fs.cpSync(path.join(publishDir, '../dist/client/build/'), buildDir, { recursive: true })

  // eslint-disable-next-line no-console
  console.log(
    `Copying built Hydrogen/Remix project files for Netlify Edge Function bundling (Current directory: '${process.cwd()}').`,
  )
}

module.exports.onBuild = onBuild
