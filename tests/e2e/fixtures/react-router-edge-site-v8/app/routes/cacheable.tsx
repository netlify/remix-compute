import { type HeadersFunction, data, useLoaderData } from 'react-router'

export const loader = () => {
  return data(
    {
      message: `Response generated at ${new Date().toISOString()}`,
    },
    {
      headers: {
        'CDN-Cache-Control': 'public, max-age=60',
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
      <h1>Cacheable</h1>
      <p>{message}</p>
    </div>
  )
}
