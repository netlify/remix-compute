// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('node:fs')

function onBuild() {
  fs.mkdirSync('./.netlify/edge-functions/', { recursive: true })
  fs.copyFileSync('./dist/worker/index.js', './.netlify/edge-functions/server.js')

  fs.mkdirSync('./public/build/', { recursive: true })
  fs.cpSync('./dist/client/build/', './public/build/', { recursive: true })

  // eslint-disable-next-line no-console
  console.log(
    `Copying built Hydrogen/Remix project files for Netlify Edge Function bundling (Current directory: '${process.cwd()}').`,
  )
}

module.exports.onBuild = onBuild
