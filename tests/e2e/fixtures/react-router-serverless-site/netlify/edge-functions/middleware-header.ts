import type { Config, Context } from '@netlify/edge-functions'

const handler = async (_request: Request, context: Context): Promise<Response> => {
  const originResponse = await context.next()

  originResponse.headers.set('Foo', 'bar')
  return originResponse
}

export default handler

export const config: Config = {
  path: '/middleware-header',
}
