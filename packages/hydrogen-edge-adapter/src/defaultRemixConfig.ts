import type { AppConfig } from '@remix-run/dev'

// Modifications to the stock AppConfig
const config: AppConfig = {}

if (process.env.NODE_ENV === 'production') {
  config.serverConditions = ['deno', 'worker']
}

// This can’t be an export via index.ts
// server.js contains a few things that can’t be
// imported in the remix config

export default config
