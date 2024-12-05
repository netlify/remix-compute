import { useLoaderData } from "@remix-run/react";
import { type LoaderArgs } from "@netlify/remix-adapter";

export async function loader({ context }: LoaderArgs) {
  return {
    siteName: context.site?.name,
  };
}
export default function About() {
  const { siteName } = useLoaderData<typeof loader>();
  return <div>This site name is {siteName}</div>;
}
