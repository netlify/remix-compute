import { type HeadersFunction } from "@remix-run/node";
import { json, useLoaderData } from "@remix-run/react";

export const loader = () => {
  return json(
    {
      message: "Loader for this page is passing caching headers",
    },
    {
      headers: {
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
};

export const headers: HeadersFunction = ({ loaderHeaders }) => {
  return loaderHeaders;
};

export default function HeadersDemo() {
  const { message } = useLoaderData<typeof loader>();
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.4" }}>
      <h1>Headers</h1>
      <p>{message}</p>
    </div>
  );
}
