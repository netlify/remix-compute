import {generateHandlerFunction} from '@netlify/hydrogen-edge-adapter';

// Project-specific imports
import {HydrogenSession} from '~/lib/session.server';
import {getLocaleFromRequest} from '~/lib/utils';

export default generateHandlerFunction({
  HydrogenSession,
  getLocaleFromRequest,
});

export const config = {
  path: '/*',

  // Allow Remix to handle caching Edge Functions
  // https://docs.netlify.com/edge-functions/optional-configuration/#configure-an-edge-function-for-caching
  cache: 'manual',

  // Let the CDN handle requests for static assets, i.e. /_assets/*
  // Add other exclusions here, e.g. "/api/*$" for custom Netlify functions or custom Netlify Edge Functions
  excludedPath: ['/build/*'],

  // Use built-in Remix error handling
  onError: 'bypass',
};
