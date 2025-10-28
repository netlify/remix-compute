import { type RouteConfig, index, route } from '@react-router/dev/routes'

export default [
  index('routes/home.tsx'),
  route('context', 'routes/context.tsx'),
  route('middleware', 'routes/middleware.tsx'),
] satisfies RouteConfig
