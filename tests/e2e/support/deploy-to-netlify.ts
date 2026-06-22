import { execFile } from 'node:child_process'
import { writeFile, copyFile, mkdir, mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { URL, fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { cpus } from 'os'
import { glob } from 'tinyglobby'
import pLimit from 'p-limit'

const execFileAsync = promisify(execFile)

// Build/install/deploy commands can emit far more than the default 1 MB stdout cap.
const MAX_BUFFER = 100 * 1024 * 1024

/** Run a command (without a shell) in `cwd`, returning its captured stdout/stderr. */
const run = (file: string, args: string[], cwd: string) => execFileAsync(file, args, { cwd, maxBuffer: MAX_BUFFER })

// https://app.netlify.com/sites/remix-compute-e2e-tests
const SITE_ID = process.env.NETLIFY_SITE_ID ?? 'b1858b58-d401-4aef-9b3b-80b8ae9247c0'

export interface Fixture {
  deployId: string
  url: string
  logs: string
}

/** Options controlling how a fixture is prepared before deploy. */
export interface DeployFixtureOptions {
  /** Extra pnpm `overrides` to inject into the fixture before install */
  overrides?: Record<string, string>
}

/**
 * Prepare an instance of the given fixture site and deploy it to Netlify.
 * @param fixtureName name of the folder inside the fixtures folder
 * @param options see {@link DeployFixtureOptions}
 */
export const deployFixture = async (fixtureName: string, options: DeployFixtureOptions = {}): Promise<Fixture> => {
  const isolatedFixtureRoot = await prepareFixture(fixtureName, options)
  const result = await deploySite(isolatedFixtureRoot)
  return result
}

/**
 * Copy a fixture site to an isolated temp directory, prepare its dependencies, link it against any
 * applicable local packages, and make it deployable to Netlify.
 */
const prepareFixture = async (fixtureName: string, options: DeployFixtureOptions): Promise<string> => {
  const isolatedFixtureRoot = await mkdtemp(join(tmpdir(), 'netlify-remix-compute-e2e-'))
  console.log(`📂 Copying fixture '${fixtureName}' to '${isolatedFixtureRoot}'...`)

  const src = fileURLToPath(new URL(`../fixtures/${fixtureName}`, import.meta.url))
  await copyFixture(src, isolatedFixtureRoot)

  await prepareDeps(isolatedFixtureRoot, resolve('.', 'packages'), options.overrides ?? {})

  await run('git', ['init'], isolatedFixtureRoot)

  return isolatedFixtureRoot
}

const packages = [
  { name: '@netlify/remix-adapter', dirName: 'remix-adapter' },
  { name: '@netlify/remix-edge-adapter', dirName: 'remix-edge-adapter' },
  { name: '@netlify/remix-runtime', dirName: 'remix-runtime' },
  { name: '@netlify/vite-plugin-react-router', dirName: 'vite-plugin-react-router' },
]

/**
 * Inject the current revision of this repo's packages into the fixture.
 *
 * We can't use a simpler approach like a monorepo workspace or `npm link` because the fixture site
 * needs to be self-contained to be deployable to Netlify (i.e. it can't have symlinks).
 */
const prepareDeps = async (
  cwd: string,
  packagesAbsoluteDir: string,
  extraOverrides: Record<string, string>,
): Promise<void> => {
  const packageJson = JSON.parse(await readFile(`${cwd}/package.json`, 'utf-8'))
  const { dependencies = {}, devDependencies = {} } = packageJson
  // Caller-supplied overrides (e.g. pinning a Vite major) seed the map; local-package links are
  // added below. Links take precedence to ensure we always test the local build.
  const overrides: Record<string, string> = { ...extraOverrides }
  for (const pkg of packages) {
    if (pkg.name in dependencies || pkg.name in devDependencies) {
      const isDevDep = pkg.name in devDependencies
      console.log(`📦 Injecting ${pkg.name} ${isDevDep ? 'dev ' : ''}dependency...`)
      const { stdout } = await run(
        'npm',
        ['pack', '--json', '--ignore-scripts', '--pack-destination', cwd],
        join(packagesAbsoluteDir, pkg.dirName),
      )
      const [{ filename }] = JSON.parse(stdout)
      // Ensure that even a transitive dependency on this package is overridden.
      overrides[pkg.name] = `file:${filename}`
    }
  }
  // As of pnpm 11, `overrides` in `package.json` is silently ignored; it must live in
  // `pnpm-workspace.yaml`.
  await writeFile(join(cwd, 'pnpm-workspace.yaml'), buildWorkspaceYaml(overrides))
  // pnpm 10+ blocks dependency build scripts by default. Using this flag isn't ideal, but
  // the blast radius is small-ish and I can't come up with a better solution.
  await run('pnpm', ['install', '--dangerously-allow-all-builds'], cwd)
}

/** Build a `pnpm-workspace.yaml` pinning the injected local packages to the freshly packed builds. */
const buildWorkspaceYaml = (overrides: Record<string, string>): string => {
  const lines = ['overrides:']
  for (const [name, value] of Object.entries(overrides)) {
    lines.push(`  '${name}': '${value}'`)
  }
  return `${lines.join('\n')}\n`
}

const deploySite = async (isolatedFixtureRoot: string): Promise<Fixture> => {
  console.log(`🚀 Building and deploying site...`)

  const outputFile = 'deploy-output.txt'

  const { stdout, stderr } = await run('ntl', ['deploy', '--site', SITE_ID], isolatedFixtureRoot)
  const output = stdout + stderr
  await writeFile(join(isolatedFixtureRoot, outputFile), output)

  const [url] = new RegExp(/https:.+\.netlify\.app/gm).exec(output) || []
  if (!url) {
    throw new Error('Could not extract the URL from the build logs')
  }

  console.log(`🌍 Deployed site is live: ${url}`)

  const [deployId] = new URL(url).host.split('--')
  return { url, deployId, logs: output }
}

const copyFixture = async (src: string, dest: string): Promise<void> => {
  const files = await glob('**/*', {
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
