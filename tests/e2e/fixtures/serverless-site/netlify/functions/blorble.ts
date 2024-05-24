import type { Config } from "@netlify/functions";

const handler = async (): Promise<Response> => {
  return new Response("gurble");
};

export default handler;

export const config: Config = {
  path: "/please-blorble",
};
