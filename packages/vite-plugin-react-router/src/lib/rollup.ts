import type { InputOption } from 'rollup'

/**
 * Normalizes Rollup's `input` option to an object format.
 *
 * Rollup accepts `input` as a string, array, or object, but Vite's `mergeConfig`
 * doesn't handle cross-type merging (e.g., merging an array with an object).
 * This function normalizes any input format to an object so entries can be merged.
 *
 * @see https://rollupjs.org/configuration-options/#input
 */
export function normalizeRollupInput(input: InputOption | undefined): Record<string, string> {
  if (input == null) {
    return {}
  }

  if (typeof input === 'string') {
    // For a single string input, the default entry name is 'index'
    return { index: input }
  }

  if (Array.isArray(input)) {
    // Rollup uses the file name (without extension) as the entry name for array inputs
    // e.g., 'src/main.ts' -> 'main', 'virtual:react-router/server-build' -> 'server-build'
    return Object.fromEntries(
      input.map((entry) => {
        const name = entry.split('/').pop()?.replace(/\.[^.]+$/, '') ?? entry
        return [name, entry]
      }),
    )
  }

  // Already an object
  return input
}

/**
 * Merges new entries into an existing Rollup `input` option. Use this when you don't
 * control the existing `input` and need to add new entries without clobbering.
 */
export function mergeRollupInput(
  existing: InputOption | undefined,
  newEntries: Record<string, string>,
): Record<string, string> {
  return {
    ...normalizeRollupInput(existing),
    ...newEntries,
  }
}
