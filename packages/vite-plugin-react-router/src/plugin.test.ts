import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import { netlifyPlugin } from './plugin.js'

// The plugin's hooks are written in function form, so we can call them directly.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getHooks = (plugin: ReturnType<typeof netlifyPlugin>) => plugin as any

describe('configEnvironment', () => {
  it('adds the function handler entry to the ssr environment for builds', () => {
    const plugin = getHooks(netlifyPlugin())
    const result = plugin.configEnvironment(
      'ssr',
      { build: { rollupOptions: { input: 'virtual:react-router/server-build' } } },
      { command: 'build', mode: 'production' },
    )
    expect(result?.build?.rollupOptions?.input).toEqual({
      'server-build': 'virtual:react-router/server-build',
      server: 'virtual:netlify-server',
    })
    expect(result?.build?.rollupOptions?.output?.entryFileNames).toBeTypeOf('function')
  })

  it('adds the function handler entry to server bundle environments for builds', () => {
    const plugin = getHooks(netlifyPlugin())
    const result = plugin.configEnvironment('ssrBundle_main', {}, { command: 'build', mode: 'production' })
    expect(result?.build?.rollupOptions?.input).toEqual({
      server: 'virtual:netlify-server',
    })
  })

  it('does not modify the client environment', () => {
    const plugin = getHooks(netlifyPlugin())
    const result = plugin.configEnvironment('client', {}, { command: 'build', mode: 'production' })
    expect(result).toBeUndefined()
  })

  it('does not modify environments in dev', () => {
    const plugin = getHooks(netlifyPlugin())
    const result = plugin.configEnvironment('ssr', {}, { command: 'serve', mode: 'development' })
    expect(result).toBeUndefined()
  })

  it('configures resolution for edge environments', () => {
    const plugin = getHooks(netlifyPlugin({ edge: true }))
    const result = plugin.configEnvironment('ssr', {}, { command: 'build', mode: 'production' })
    expect(result?.resolve?.conditions).toEqual(['worker', 'deno', 'browser'])
    expect(result?.resolve?.noExternal).toBeInstanceOf(RegExp)
  })
})

describe('writeBundle', () => {
  let root: string

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'vite-plugin-react-router-test-'))
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  const setUpPluginForBuild = async (options = {}) => {
    const plugin = getHooks(netlifyPlugin(options))
    // Simulate an Environment API build, where `isSsrBuild` is never set.
    plugin.config({}, { command: 'build', mode: 'production' })
    await plugin.configResolved.handler({
      root,
      plugins: [],
      build: { outDir: join(root, 'build', 'client') },
    })
    return plugin
  }

  it('writes the server handler function when building the ssr environment', async () => {
    const plugin = await setUpPluginForBuild()
    await plugin.writeBundle.call({
      environment: { name: 'ssr', config: { build: { outDir: join(root, 'build', 'server') } } },
    })
    const generated = await readFile(join(root, '.netlify/v1/functions/react-router-server.mjs'), 'utf8')
    expect(generated).toContain('export { default } from "../../../build/server/server.js"')
    expect(generated).toContain('preferStatic: true')
  })

  it('resolves a relative environment outDir against the root', async () => {
    const plugin = await setUpPluginForBuild()
    await plugin.writeBundle.call({
      environment: { name: 'ssr', config: { build: { outDir: 'build/server' } } },
    })
    const generated = await readFile(join(root, '.netlify/v1/functions/react-router-server.mjs'), 'utf8')
    expect(generated).toContain('export { default } from "../../../build/server/server.js"')
  })

  it('does not write the function when building the client environment', async () => {
    const plugin = await setUpPluginForBuild()
    await plugin.writeBundle.call({
      environment: { name: 'client', config: { build: { outDir: join(root, 'build', 'client') } } },
    })
    await expect(readFile(join(root, '.netlify/v1/functions/react-router-server.mjs'), 'utf8')).rejects.toThrow()
  })

  it('falls back to the legacy isSsrBuild flag when there is no environment', async () => {
    const plugin = getHooks(netlifyPlugin())
    plugin.config({}, { command: 'build', mode: 'production', isSsrBuild: true })
    await plugin.configResolved.handler({
      root,
      plugins: [],
      build: { outDir: join(root, 'build', 'server') },
    })
    await plugin.writeBundle.call({ environment: undefined })
    const generated = await readFile(join(root, '.netlify/v1/functions/react-router-server.mjs'), 'utf8')
    expect(generated).toContain('export { default } from "../../../build/server/server.js"')
  })
})
