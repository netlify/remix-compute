import { execaCommand } from 'execa'
import fg from 'fast-glob'
import { writeFile, copyFile, mkdir, mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cpus } from 'os'
import pLimit from 'p-limit'

// https://app.netlify.com/sites/remix-compute-e2e-tests
const SITE_ID = process.env.NETLIFY_SITE_ID ?? 'b1858b58-d401-4aef-9b3b-80b8ae9247c0'

export interface Fixture {
  deployId: string
  url: string
  logs: string
}

/**
 * Prepare an instance of the given fixture site and deploy it to Netlify.
 * @param fixtureName name of the folder inside the fixtures folder
 */
export const deployFixture = async (fixtureName: string): Promise<Fixture> => {
  const isolatedFixtureRoot = await prepareFixture(fixtureName)
  const result = await deploySite(isolatedFixtureRoot)
  return result
}

/**
 * Copy a fixture site to an isolated temp directory, prepare its dependencies, link it against any
 * applicable local packages, and make it deployable to Netlify.
 */
const prepareFixture = async (fixtureName: string): Promise<string> => {
  const isolatedFixtureRoot = await mkdtemp(join(tmpdir(), 'netlify-remix-compute-e2e-'))
  console.log(`📂 Copying fixture '${fixtureName}' to '${isolatedFixtureRoot}'...`)

  const src = fileURLToPath(new URL(`../fixtures/${fixtureName}`, import.meta.url))
  await copyFixture(src, isolatedFixtureRoot)

  await prepareDeps(isolatedFixtureRoot, resolve('.', 'packages'))

  await execaCommand('git init', { cwd: isolatedFixtureRoot })

  return isolatedFixtureRoot
}

const packages = [
  { name: '@netlify/remix-adapter', dirName: 'remix-adapter' },
  { name: '@netlify/remix-edge-adapter', dirName: 'remix-edge-adapter' },
  { name: '@netlify/remix-runtime', dirName: 'remix-runtime' },
]

/**
 * Inject the current revision of this repo's packages into the fixture.
 *
 * We can't use a simpler approach like a monorepo workspace or `npm link` because the fixture site
 * needs to be self-contained to be deployable to Netlify (i.e. it can't have symlinks).
 */
const prepareDeps = async (cwd: string, packagesAbsoluteDir: string): Promise<void> => {
  const packageJson = JSON.parse(await readFile(`${cwd}/package.json`, 'utf-8'))
  packageJson.pnpm ??= { overrides: {} }
  const { dependencies = {}, devDependencies = {} } = packageJson
  for (const pkg of packages) {
    if (pkg.name in dependencies || pkg.name in devDependencies) {
      const isDevDep = pkg.name in devDependencies
      console.log(`📦 Injecting ${pkg.name} ${isDevDep ? 'dev ' : ''}dependency...`)
      const { stdout } = await execaCommand(`npm pack --json --ignore-scripts --pack-destination ${cwd}`, {
        cwd: join(packagesAbsoluteDir, pkg.dirName),
      })
      const [{ filename }] = JSON.parse(stdout)
      // Ensure that even a transitive dependency on this package is overridden.
      packageJson.pnpm.overrides[pkg.name] = `file:${filename}`
    }
  }
  await writeFile(`${cwd}/package.json`, JSON.stringify(packageJson, null, 2))
  await execaCommand('pnpm install', { cwd })
}

const deploySite = async (isolatedFixtureRoot: string): Promise<Fixture> => {
  console.log(`🚀 Building and deploying site...`)

  const outputFile = 'deploy-output.txt'
  const cmd = `ntl deploy --build --site ${SITE_ID}`

  await execaCommand(cmd, { cwd: isolatedFixtureRoot, all: true }).pipeAll?.(join(isolatedFixtureRoot, outputFile))
  const output = await readFile(join(isolatedFixtureRoot, outputFile), 'utf-8')

  const [url] = new RegExp(/https:.+\.netlify\.app/gm).exec(output) || []
  if (!url) {
    throw new Error('Could not extract the URL from the build logs')
  }

  console.log(`🌍 Deployed site is live: ${url}`)

  const [deployId] = new URL(url).host.split('--')
  return { url, deployId, logs: output }
}

const copyFixture = async (src: string, dest: string): Promise<void> => {
  const files = await fg.glob('**/*', {
    ignore: ['node_modules'],
    dot: true,
    cwd: src,
  })

  // There could be thousands of files here, so ensure we avoid resource exhaustion.
  const limit = pLimit(Math.max(2, cpus().length))
  await Promise.all(
    files.map((file) =>
      limit(async () => {
        await mkdir(join(dest, dirname(file)), { recursive: true })
        await copyFile(join(src, file), join(dest, file))
      }),
    ),
  )
}
