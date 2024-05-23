import { Await, defer, useLoaderData } from "@remix-run/react";
import { Suspense } from "react";

export async function loader() {
  const messagePromise = new Promise<string>((resolve) => {
    setTimeout(() => {
      resolve("This is an about page streamed from the server.");
    }, 2000);
  });
  return defer({ message: messagePromise });
}
export default function About() {
  const { message } = useLoaderData<typeof loader>();
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.4" }}>
      <h1>About</h1>
      <Suspense fallback={"Loading..."}>
        <Await resolve={message}>{(message) => <p>{message}</p>}</Await>
      </Suspense>
    </div>
  );
}
