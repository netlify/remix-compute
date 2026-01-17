import { basename, extname } from 'node:path'

import type { Rollup } from 'vite'

/**
 * Derives the default entry name from a module ID, matching Rollup's internal behavior.
 * Unfortunately this logic isn't exposed publicly, but it's fairly simple (foo/bar/baz.ts -> baz)
 * so we replicate it here.
 * @see https://github.com/rollup/rollup/blob/fed6c1d/src/utils/relativeId.ts#L4-L7
 */
const getAliasName = (id: string): string => {
  const base = basename(id)
  return base.slice(0, Math.max(0, base.length - extname(id).length))
}

/**
 * Normalizes Rollup's `input` option to an object format.
 *
 * Rollup accepts `input` as a string, array, or object, but Vite's `mergeConfig`
 * doesn't handle cross-type merging (e.g., merging an array with an object).
 * This function normalizes any input format to an object so entries can be merged.
 *
 * @see https://rollupjs.org/configuration-options/#input
 */
export const normalizeRollupInput = (input: Rollup.InputOption | undefined): Record<string, string> => {
  if (input == null) {
    return {}
  }

  if (typeof input === 'string') {
    return { [getAliasName(input)]: input }
  }

  if (Array.isArray(input)) {
    return Object.fromEntries(input.map((entry) => [getAliasName(entry), entry]))
  }

  // Already an object
  return input
}

/**
 * Merges new entries into an existing Rollup `input` option. Use this when you don't
 * control the existing `input` and need to add new entries without clobbering.
 */
export const mergeRollupInput = (
  existing: Rollup.InputOption | undefined,
  newEntries: Record<string, string>,
): Record<string, string> => {
  return {
    ...normalizeRollupInput(existing),
    ...newEntries,
  }
}
