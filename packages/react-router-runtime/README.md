# Remix Server Runtime for Netlify

The Remix Server Runtime for Netlify is a
[serverless edge runtime](https://github.com/remix-run/remix/tree/main/packages/remix-server-runtime#readme) for
[Remix](https://remix.run) apps. It's built on top of
[Netlify Edge Functions](https://docs.netlify.com/edge-functions/overview/).

You shouldn't generally need to import or depend on this package. It is an internal implementation detail of
[`@netlify/remix-edge-adapter`](https://github.com/netlify/remix-compute/tree/main/packages/remix-edge-adapter). The
only exception is if you're using the Remix classic compiler instead of Vite, in which case you may want to
[import `broadcastDevReady`](https://github.com/netlify/remix-compute/blob/44502dd8a8aaabf37a1ff945a1ebb362fa35034e/demos/edge-demo-site/server.ts#L12-L15).
