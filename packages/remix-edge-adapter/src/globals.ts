// @ts-expect-error This global is available in Netlify Edge Functions
globalThis.process ||= { env: Netlify.env.toObject() }
