import type { Config } from '@react-router/dev/config'

export default {
  // Config options...
  // Server-side render by default, to enable SPA mode set this to `false`
  ssr: true,
  // Previously disabled due to https://github.com/remix-run/react-router/issues/13226#issuecomment-2776672461.
  // Now enabled after fixing rollupOptions.input merge in plugin.ts to preserve existing entries
  // including 'virtual:react-router/server-build'.
  prerender: ['/prerendered'],
} satisfies Config
