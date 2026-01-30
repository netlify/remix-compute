// Remix expects `process.env` to be available, but it isn't available in the Edge (Deno) runtime.
// TODO(serhalp) Consider using the official Deno polyfill (https://deno.land/std/node/process.ts)
// @ts-expect-error This global is available in Netlify Edge Functions
globalThis.process ||= { env: Netlify.env.toObject() }
