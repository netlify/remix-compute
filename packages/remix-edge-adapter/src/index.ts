import './globals'

export type { GetLoadContextFunction, RequestHandler } from './server'
export { createRequestHandler } from './server'
export { config } from './defaultRemixConfig'
export { handleRequest, handleRequest as default } from './entry.server'
