import { createRequestHandler } from "@netlify/remix-edge-adapter";
// @ts-expect-error virtual module
// eslint-disable-next-line import/no-unresolved
import * as build from "virtual:remix/server-build";

export default createRequestHandler({
  build,
});

export const config = {
  cache: "manual",
  path: "/*",
  excludedPath: ["/build/*", "/favicon.ico", "/service-worker.js"],
};
