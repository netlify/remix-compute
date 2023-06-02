import { defer } from '@remix-run/deno'
import { useLoaderData } from '@remix-run/react'

function getDateSlowly(): Promise<Date> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(new Date())
    }, 5000)
  })
}

export const loader = async () => {
  return defer({
    date: await getDateSlowly(),
  })
}

export default function Index() {
  // create a useLoaderfor the loader above
  const {
    data: { date },
  } = useLoaderData<typeof loader>()

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', lineHeight: '1.4' }}>
      <h1>Welcome to Remix</h1>
      <p>{date.toLocaleString()}</p>
    </div>
  )
}
