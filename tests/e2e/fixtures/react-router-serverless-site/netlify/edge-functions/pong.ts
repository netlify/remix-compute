import type { Config } from '@netlify/edge-functions'

const handler = async (): Promise<Response> => {
  return new Response('Pong!')
}

export default handler

export const config: Config = {
  path: '/ping',
}
