import { json, useLoaderData } from "@remix-run/react";
import { getStore } from "@netlify/blobs";

export async function loader() {
  const store = getStore({ name: "favorites", consistency: "strong" });
  await store.set("cereal", "Raisin Bran");
  const favCereal = await store.get("cereal");
  return json({ favCereal });
}

export default function BlobsDemo() {
  const { favCereal } = useLoaderData<typeof loader>();
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.4" }}>
      <h1>Netlify Blobs demo page</h1>
      <p>My favorite breakfast cereal is {favCereal}</p>
    </div>
  );
}
