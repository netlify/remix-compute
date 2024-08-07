/**
 * This package defines a Remix "server runtime" - for Netlify Edge Functions. As such, it must
 * re-export certain types and conform to a certain interface that Remix expects. See
 * https://github.com/remix-run/remix/tree/main/packages/remix-server-runtime#readme.
 */

export {
  createCookie,
  createCookieSessionStorage,
  createMemorySessionStorage,
  createSessionStorage,
} from './implementations'

export {
  createRequestHandler,
  broadcastDevReady,
  createSession,
  defer,
  isCookie,
  isSession,
  json,
  logDevReady,
  MaxPartSizeExceededError,
  redirect,
  redirectDocument,
  unstable_composeUploadHandlers,
  unstable_createMemoryUploadHandler,
  unstable_parseMultipartFormData,
  unstable_defineLoader,
  unstable_defineAction,
  unstable_setDevServerHooks,
  UNSAFE_SingleFetchRedirectSymbol,
} from '@remix-run/server-runtime'

export type {
  ActionFunction,
  ActionFunctionArgs,
  AppLoadContext,
  Cookie,
  CookieOptions,
  CookieParseOptions,
  CookieSerializeOptions,
  CookieSignatureOptions,
  DataFunctionArgs,
  EntryContext,
  ErrorResponse,
  HandleDataRequestFunction,
  HandleDocumentRequestFunction,
  HandleErrorFunction,
  HeadersArgs,
  HeadersFunction,
  HtmlLinkDescriptor,
  JsonFunction,
  LinkDescriptor,
  LinksFunction,
  LoaderFunction,
  LoaderFunctionArgs,
  MemoryUploadHandlerFilterArgs,
  MemoryUploadHandlerOptions,
  PageLinkDescriptor,
  RequestHandler,
  SerializeFrom,
  ServerBuild,
  ServerEntryModule,
  ServerRuntimeMetaArgs as MetaArgs,
  ServerRuntimeMetaArgs,
  ServerRuntimeMetaDescriptor as MetaDescriptor,
  ServerRuntimeMetaDescriptor,
  ServerRuntimeMetaFunction as MetaFunction,
  ServerRuntimeMetaFunction,
  Session,
  SessionData,
  SessionIdStorageStrategy,
  SessionStorage,
  SignFunction,
  TypedDeferredData,
  TypedResponse,
  UnsignFunction,
  UploadHandlerPart,
  UploadHandler,
  unstable_Loader,
  unstable_Action,
  unstable_Serialize,
  UNSAFE_SingleFetchResults,
  UNSAFE_SingleFetchResult,
} from '@remix-run/server-runtime'
