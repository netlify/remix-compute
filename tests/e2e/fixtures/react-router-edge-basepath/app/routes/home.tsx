import type { Route } from './+types/home'
import { Welcome } from '../welcome/welcome'

export function meta({}: Route.MetaArgs) {
  return [{ title: 'FR - New React Router App' }, { name: 'description', content: 'Bienvenue à React Router!' }]
}

export default function Home() {
  return <Welcome />
}
