import type { Context } from '@netlify/edge-functions'

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
 *
 * Remix expects the user to use module augmentation to modify their exported `AppLoadContext` type. See
 * https://github.com/remix-run/remix/blob/5dc3b67dc31f3df7b1b0298ae4e9cac9c5ae1c06/packages/remix-server-runtime/data.ts#L15-L23
 * Hydrogen follows this pattern. However, because of the way TypeScript module augmentation works,
 * we can't access the final user-augmented type here, so we have to do this dance with generic types.
 */
type CreateAppLoadContext<E extends {}, C extends {}> = (
  request: Request,
  env: E,
  executionContext: ExecutionContext,
) => Promise<C>

const executionContext: ExecutionContext = {
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

export const createHydrogenAppLoadContext = async <E extends {}, C extends {}>(
  request: Request,
  netlifyContext: Context,
  createAppLoadContext: CreateAppLoadContext<E, C>,
): Promise<Context & C & Record<string, unknown>> => {
  const env = getEnv() as E
  const userHydrogenContext = await createAppLoadContext(request, env, executionContext)

  // NOTE: We use `Object.assign` here because a spread would access the getters on the
  // `netlifyContext` fields, some of which throw a "not implemented" error in local dev.
  return Object.assign(netlifyContext, userHydrogenContext)
}
