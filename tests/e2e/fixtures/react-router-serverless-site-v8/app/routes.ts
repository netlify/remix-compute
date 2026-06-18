import { type RouteConfig, index, route } from '@react-router/dev/routes'

export default [
  index('routes/home.tsx'),
  route('about', 'routes/about.tsx'),
  route('blobs', 'routes/blobs.tsx'),
  route('cacheable', 'routes/cacheable.tsx'),
  route('context', 'routes/context.tsx'),
  route('headers', 'routes/headers.tsx'),
  route('images', 'routes/images.tsx'),
  route('middleware-header', 'routes/middleware-header.tsx'),
  route('prerendered', 'routes/prerendered.tsx'),
] satisfies RouteConfig
