import { expect, it } from 'vitest'
import { Plugin } from 'vite'

import { netlifyPlugin } from './plugin.js'

it('exports a Vite plugin factory', () => {
  const plugin = netlifyPlugin()
  expect(plugin).toBeInstanceOf(Object)
})
