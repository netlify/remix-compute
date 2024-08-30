import {createHydrogenContext, InMemoryCache} from '@shopify/hydrogen';
import {AppSession} from '~/lib/session';
import {CART_QUERY_FRAGMENT} from '~/lib/fragments';

type WaitUntil = (promise: Promise<unknown>) => void;

/**
 * The context implementation is separate from server.ts
 * so that type can be extracted for AppLoadContext
 */
export async function createAppLoadContext(
  request: Request,
  env: Env,
  waitUntil: WaitUntil,
) {
  /**
   * Open a cache instance in the worker and a custom session instance.
   */
  if (!env?.SESSION_SECRET) {
    throw new Error('SESSION_SECRET environment variable is not set');
  }

  const session = await AppSession.init(request, [env.SESSION_SECRET]);

  const hydrogenContext = createHydrogenContext({
    env,
    request,
    cache: new InMemoryCache(),
    waitUntil,
    session,
    i18n: {language: 'EN', country: 'US'},
    cart: {
      queryFragment: CART_QUERY_FRAGMENT,
    },
  });

  return {
    ...hydrogenContext,
  };
}
