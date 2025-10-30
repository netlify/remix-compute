import type { AppLoadContext } from 'react-router'
import { type RouterContext, createContext, RouterContextProvider } from 'react-router'

/**
 * A function that returns the value to use as `context` in route `loader` and `action` functions.
 *
 * You can think of this as an escape hatch that allows you to pass environment/platform-specific
 * values through to your loader/action.
 *
 * NOTE: v7.9.0 introduced a breaking change when the user opts in to `future.v8_middleware`. This
 * requires returning an instance of `RouterContextProvider` instead of a plain object. We have a
 * peer dependency on >=7.9.0 so we can safely *import* these, but we cannot assume the user has
 * opted in to the flag.
 */
export type GetLoadContextFunction<TNetlifyContext> =
  | ((
      request: Request,
      context: TNetlifyContext,
    ) => Promise<RouterContextProvider> | RouterContextProvider)
  | ((request: Request, context: TNetlifyContext) => Promise<AppLoadContext> | AppLoadContext)

/**
 * Creates a RouterContext that provides access to Netlify request context.
 * Uses a Proxy to always read from the current `Netlify.context` value, which is always
 * contextual to the in-flight request.
 *
 * @example context.get(netlifyRouterContext).geo?.country?.name
 */
export function createNetlifyRouterContext<TNetlifyContext>(): RouterContext<
  Partial<TNetlifyContext>
> {
  // We must use a singleton because Remix contexts rely on referential equality.
  // We can't hook into the request lifecycle in dev mode, so we use a Proxy to always read from the
  // current `Netlify.context` value, which is always contextual to the in-flight request.
  return createContext<Partial<TNetlifyContext>>(
    new Proxy(
      // Can't reference `Netlify.context` here because it isn't set outside of a request lifecycle
      {},
      {
        get(_target, prop, receiver) {
          return Reflect.get(Netlify.context ?? {}, prop, receiver)
        },
        set(_target, prop, value, receiver) {
          return Reflect.set(Netlify.context ?? {}, prop, value, receiver)
        },
        has(_target, prop) {
          return Reflect.has(Netlify.context ?? {}, prop)
        },
        deleteProperty(_target, prop) {
          return Reflect.deleteProperty(Netlify.context ?? {}, prop)
        },
        ownKeys(_target) {
          return Reflect.ownKeys(Netlify.context ?? {})
        },
        getOwnPropertyDescriptor(_target, prop) {
          return Reflect.getOwnPropertyDescriptor(Netlify.context ?? {}, prop)
        },
      },
    ),
  )
}

