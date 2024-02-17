// @ts-expect-error virtual module
// eslint-disable-next-line import/no-unresolved
import * as mod from "virtual:netlify-server-entry";
export default mod.handleRequest ?? mod.default;
