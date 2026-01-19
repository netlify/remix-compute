import { describe, it, expect } from 'vitest'

import { normalizeRollupInput, mergeRollupInput } from './rollup.js'

describe('normalizeRollupInput', () => {
  it('returns empty object for undefined input', () => {
    expect(normalizeRollupInput(undefined)).toEqual({})
  })

  it('uses filename (without extension) as the entry name for string input', () => {
    expect(normalizeRollupInput('src/main.ts')).toEqual({
      main: 'src/main.ts',
    })
  })

  it('uses full string as entry name when there is no path separator', () => {
    // basename('virtual:some-module') returns 'virtual:some-module' since there's no /
    expect(normalizeRollupInput('virtual:some-module')).toEqual({
      'virtual:some-module': 'virtual:some-module',
    })
  })

  describe('array input', () => {
    it('returns empty object for empty array', () => {
      expect(normalizeRollupInput([])).toEqual({})
    })

    it('uses filename as entry name for each entry', () => {
      expect(normalizeRollupInput(['src/main.ts', 'src/worker.ts'])).toEqual({
        main: 'src/main.ts',
        worker: 'src/worker.ts',
      })
    })

    it('treats virtual modules the same as filenames', () => {
      expect(normalizeRollupInput(['virtual:react-router/server-build'])).toEqual({
        'server-build': 'virtual:react-router/server-build',
      })
    })
  })

  describe('object input', () => {
    it('returns empty object for empty object input', () => {
      expect(normalizeRollupInput({})).toEqual({})
    })

    it('returns the object as is', () => {
      const input = { main: 'src/main.ts', other: 'src/other.ts' }
      expect(normalizeRollupInput(input)).toEqual(input)
    })
  })
})

describe('mergeRollupInput', () => {
  it('returns new entries when existing is undefined', () => {
    expect(mergeRollupInput(undefined, { server: 'virtual:netlify-server' })).toEqual({
      server: 'virtual:netlify-server',
    })
  })

  it('merges with string existing input', () => {
    expect(mergeRollupInput('src/main.ts', { server: 'virtual:netlify-server' })).toEqual({
      main: 'src/main.ts',
      server: 'virtual:netlify-server',
    })
  })

  it('merges with array existing input', () => {
    expect(mergeRollupInput(['src/main.ts', 'src/worker.ts'], { server: 'virtual:netlify-server' })).toEqual({
      main: 'src/main.ts',
      worker: 'src/worker.ts',
      server: 'virtual:netlify-server',
    })
  })

  it('merges with object existing input', () => {
    expect(mergeRollupInput({ app: 'src/main.ts' }, { server: 'virtual:netlify-server' })).toEqual({
      app: 'src/main.ts',
      server: 'virtual:netlify-server',
    })
  })

  it('allows new entries to override existing keys', () => {
    expect(mergeRollupInput({ server: 'old-server.ts' }, { server: 'virtual:netlify-server' })).toEqual({
      server: 'virtual:netlify-server',
    })
  })
})
