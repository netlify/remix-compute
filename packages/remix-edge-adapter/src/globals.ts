// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
globalThis.process ||= { env: Deno.env.toObject() }
