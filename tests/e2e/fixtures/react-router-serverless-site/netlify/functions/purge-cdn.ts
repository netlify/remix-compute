import { type Config, purgeCache } from '@netlify/functions'

const handler = async (request: Request): Promise<Response> => {
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

  console.log('Purging', tagToPurge)
  await purgeCache({ tags: [tagToPurge] })

  return new Response(null, { status: 204 })
}

export default handler

export const config: Config = {
  path: '/purge-cdn',
}
