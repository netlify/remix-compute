/*
Remix provides `process.env.NODE_ENV` at compile time.
Declare types for `process` here so that they are available in Deno.
*/

interface ProcessEnv {
  NODE_ENV?: "development" | "production" | "test";
  [key: string]: string | undefined;
}
interface Process {
  env: ProcessEnv;
}
declare global {
  // deno-lint-ignore no-var
  var process: Process;
}
globalThis.process ||= { env: Deno.env.toObject() };

