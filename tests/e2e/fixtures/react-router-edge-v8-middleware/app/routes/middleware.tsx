import { netlifyRouterContext } from '@netlify/vite-plugin-react-router/edge'

import type { Route } from './+types/middleware'

const logMiddleware: Route.MiddlewareFunction = async ({ request, context }, next) => {
  const siteName = context.get(netlifyRouterContext).site.name
  console.log(`Handling ${request.method} request to ${request.url} on ${siteName}`)
  const response = await next()
  response.headers.set('x-test-site-name', siteName)
  return response
}

export const middleware: Route.MiddlewareFunction[] = [logMiddleware]

export default function Home() {
  return <h1>Middleware</h1>
}
