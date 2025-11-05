import { type HeadersFunction } from "@remix-run/node";
import { json, useLoaderData } from "@remix-run/react";

export const loader = () => {
  return json(
    {
      message: `Response generated at ${new Date().toISOString()}`,
    },
    {
      headers: {
        "CDN-Cache-Control": "public, max-age=60",
      },
    },
  );
};

export const headers: HeadersFunction = ({ loaderHeaders }) => {
  return loaderHeaders;
};

export default function SWRDemo() {
  const { message } = useLoaderData<typeof loader>();
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.4" }}>
      <h1>Cacheable</h1>
      <p>{message}</p>
    </div>
  );
}
