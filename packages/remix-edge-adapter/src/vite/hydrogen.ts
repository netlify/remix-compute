import type { Context } from '@netlify/edge-functions'
import type { AppLoadContext } from '@netlify/remix-runtime'
import type { HydrogenEnv } from '@shopify/hydrogen'

/**
 * The base Hydrogen templates expect a globally defined `ExecutionContext` type, which by default
 * comes from Oxygen:
 * https://github.com/Shopify/hydrogen/blob/92a53c477540ee22cc273e7f3cbd2fd0582c815f/templates/skeleton/env.d.ts#L3.
 * We do the same thing to minimize differences.
 */
declare global {
  interface ExecutionContext {
    waitUntil(promise: Promise<unknown>): void
  }
}

/**
 * For convenience, this matches the function signature that Hydrogen includes by default in its templates:
 * https://github.com/Shopify/hydrogen/blob/92a53c477540ee22cc273e7f3cbd2fd0582c815f/templates/skeleton/app/lib/context.ts.
 */
type CreateAppLoadContext = (
  request: Request,
  env: HydrogenEnv,
  executionContext: ExecutionContext,
) => Promise<AppLoadContext>
/**
 * You might think the return type above and other types in this file should have a type parameter
 * so that user-defined context and Hydrogen context could be merged with the Netlify context, but
 * this isn't the pattern Remix uses. Instead, Remix expects the user to use module augmentation to
 * modify the exported `AppLoadContext` type. See
 * https://github.com/remix-run/remix/blob/5dc3b67dc31f3df7b1b0298ae4e9cac9c5ae1c06/packages/remix-server-runtime/data.ts#L15-L23
 */

const executionContext = {
  /**
   * Hydrogen expects a `waitUntil` function like the one in the workerd runtime:
   * https://developers.cloudflare.com/workers/runtime-apis/context/#waituntil.
   * Netlify Edge Functions don't have such a function, but Deno Deploy isolates make a best-effort
   * attempt to wait for the event loop to drain, so just awaiting the promise here is equivalent.
   */
  async waitUntil(p: Promise<unknown>): Promise<void> {
    await p
  },
}

/**
 * In dev we run in a Node.js environment (via Remix Vite) but otherwise we run in a Deno (Netlify
 * Edge Functions) environment.
 */
const getEnv = () => {
  if (globalThis.Netlify) {
    return globalThis.Netlify.env.toObject()
  }
  return process.env
}

export const createHydrogenAppLoadContext = async (
  request: Request,
  netlifyContext: Context,
  createAppLoadContext: CreateAppLoadContext,
): Promise<AppLoadContext> => {
  // NOTE: We use `Object.assign` here to avoid TODO
  return Object.assign(netlifyContext, await createAppLoadContext(request, getEnv(), executionContext))
}
