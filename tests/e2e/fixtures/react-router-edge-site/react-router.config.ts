import type { Config } from '@react-router/dev/config'

export default {
  // Config options...
  // Server-side render by default, to enable SPA mode set this to `false`
  ssr: true,
  // TODO(serhalp) Revisit this if RR team changes their minds:
  // https://github.com/remix-run/react-router/issues/13226#issuecomment-2776672461.
  // prerender: ['/prerendered'],
} satisfies Config
