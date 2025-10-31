import { type HeadersFunction, data, useLoaderData } from 'react-router'

export const loader = () => {
  return data(
    {
      message: `Response generated at ${new Date().toISOString()}`,
    },
    {
      headers: {
        'CDN-Cache-Control': 'public, max-age=60, stale-while-revalidate=31536000',
        'Cache-Tag': 'stale-while-revalidate-tag',
      },
    },
  )
}

export const headers: HeadersFunction = ({ loaderHeaders }) => {
  return loaderHeaders
}

export default function SWRDemo() {
  const { message } = useLoaderData<typeof loader>()
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', lineHeight: '1.4' }}>
      <h1>Stale-while-revalidate</h1>
      <p>{message}</p>
    </div>
  )
}
