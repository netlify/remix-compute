import { type Config, type Context, purgeCache } from '@netlify/functions'

const handler = async (request: Request, context: Context): Promise<Response> => {
  const url = new URL(request.url)
  const tagToPurge = url.searchParams.get('tag')

  if (!tagToPurge) {
    return Response.json(
      {
        status: 'error',
        error: 'missing "tag" query parameter',
      },
      { status: 400 },
    )
  }

  // e2e tests exclusively create manual deploys, so this assumption is safe
  if (!context.url.hostname.includes('--')) {
    return Response.json({ error: 'No deploy alias found in hostname (missing --)' }, { status: 400 })
  }
  await purgeCache({
    tags: [tagToPurge],
    deployAlias: context.url.hostname.split('--')[0],
  })

  return new Response(null, { status: 204 })
}

export default handler

export const config: Config = {
  path: '/purge-cdn',
}
