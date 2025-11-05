import { useLoaderData } from 'react-router'
import type { Route } from './+types/context'

export async function loader({ context }: Route.LoaderArgs) {
  return {
    siteName: context.site?.name,
  }
}
export default function About() {
  const { siteName } = useLoaderData<typeof loader>()
  return <div>This site name is {siteName}</div>
}
