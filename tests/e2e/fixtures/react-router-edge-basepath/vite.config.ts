import { reactRouter } from '@react-router/dev/vite'
import autoprefixer from 'autoprefixer'
import tailwindcss from 'tailwindcss'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import netlifyPlugin from '@netlify/vite-plugin-react-router'

export default defineConfig({
  // It isn't documented that RR7 respects this user override, but it does:
  // https://github.com/remix-run/react-router/pull/13077.
  build: {
    assetsDir: 'fr',
  },
  css: {
    postcss: {
      plugins: [tailwindcss, autoprefixer],
    },
  },
  plugins: [
    reactRouter(),
    netlifyPlugin({
      edge: true,
    }),
    tsconfigPaths(),
  ],
})
