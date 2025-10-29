import type { Route } from './+types/prerendered'

export function meta({}: Route.MetaArgs) {
  return [{ title: 'Prerendered Page' }, { name: 'description', content: 'This page is prerendered at build time' }]
}

export default function Prerendered() {
  return (
    <div>
      <h1>Prerendered Page</h1>
      <p>This page was prerendered at build time and served from the CDN.</p>
    </div>
  )
}
