import {
  generateHandlerFunction,
  netlifyEdgeConfig,
} from '@netlify/hydrogen-edge-adapter';

// Project-specific imports
import {HydrogenSession} from '~/lib/session.server';
import {getLocaleFromRequest} from '~/lib/utils';

export default generateHandlerFunction({
  HydrogenSession,
  getLocaleFromRequest,
});

// Netlify Edge Function configuration
export {netlifyEdgeConfig as config};
