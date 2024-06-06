import './common/globals'

export type { GetLoadContextFunction, RequestHandler } from './common/server'
export { createRequestHandler } from './common/server'
export { config } from './classic-compiler/defaultRemixConfig'
export { default as handleRequest } from './common/entry.server'
