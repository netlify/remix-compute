import type {
  AppLoadContext,
  ServerBuild,
  RequestInit as NodeRequestInit,
  Response as NodeResponse,
} from '@remix-run/node'
import {
  AbortController as NodeAbortController,
  createRequestHandler as createRemixRequestHandler,
  Headers as NodeHeaders,
  Request as NodeRequest,
  readableStreamToString,
} from '@remix-run/node'
import type { Handler, HandlerEvent, HandlerContext, HandlerResponse } from '@netlify/functions'

import { isBinaryType } from './binary-types'

/**
 * A function that returns the value to use as `context` in route `loader` and
 * `action` functions.
 *
 * You can think of this as an escape hatch that allows you to pass
 * environment/platform-specific values through to your loader/action.
 */
export type GetLoadContextFunction = (
  event: HandlerEvent,
  context: HandlerContext,
) => Promise<AppLoadContext> | AppLoadContext

export type RequestHandler = Handler

export function createRequestHandler({
  build,
  getLoadContext,
  mode = process.env.NODE_ENV,
}: {
  build: ServerBuild
  getLoadContext?: GetLoadContextFunction
  mode?: string
}): RequestHandler {
  const handleRequest = createRemixRequestHandler(build, mode)

  return async (event, context) => {
    const request = createRemixRequest(event)
    const loadContext = await getLoadContext?.(event, context)

    const response = (await handleRequest(request, loadContext)) as NodeResponse
    console.log('response', response)
    return sendRemixResponse(response)
  }
}

export function createRemixRequest(event: HandlerEvent): NodeRequest {
  let url: URL

  if (process.env.NODE_ENV !== 'development') {
    url = new URL(event.rawUrl)
  } else {
    const origin = event.headers.host
    const rawPath = getRawPath(event)
    url = new URL(`http://${origin}${rawPath}`)
  }

  // Note: No current way to abort these for Netlify, but our router expects
  // requests to contain a signal so it can detect aborted requests
  const controller = new NodeAbortController()

  const init: NodeRequestInit = {
    method: event.httpMethod,
    headers: createRemixHeaders(event.multiValueHeaders),
    // Cast until reason/throwIfAborted added
    // https://github.com/mysticatea/abort-controller/issues/36
    signal: controller.signal as NodeRequestInit['signal'],
  }

  if (event.httpMethod !== 'GET' && event.httpMethod !== 'HEAD' && event.body) {
    const isFormData = event.headers['content-type']?.includes('multipart/form-data')
    init.body = event.isBase64Encoded
      ? isFormData
        ? Buffer.from(event.body, 'base64')
        : Buffer.from(event.body, 'base64').toString()
      : event.body
  }

  return new NodeRequest(url.href, init)
}

export function createRemixHeaders(requestHeaders: HandlerEvent['multiValueHeaders']): NodeHeaders {
  const headers = new NodeHeaders()

  for (const [key, values] of Object.entries(requestHeaders)) {
    if (values) {
      for (const value of values) {
        headers.append(key, value)
      }
    }
  }

  return headers
}

// `netlify dev` doesn't return the full url in the event.rawUrl, so we need to create it ourselves
function getRawPath(event: HandlerEvent): string {
  let rawPath = event.path
  const searchParams = new URLSearchParams()

  if (!event.multiValueQueryStringParameters) {
    return rawPath
  }

  const paramKeys = Object.keys(event.multiValueQueryStringParameters)
  for (const key of paramKeys) {
    const values = event.multiValueQueryStringParameters[key]
    if (!values) continue
    for (const val of values) {
      searchParams.append(key, val)
    }
  }

  const rawParams = searchParams.toString()

  if (rawParams) rawPath += `?${rawParams}`

  return rawPath
}

export async function sendRemixResponse(nodeResponse: NodeResponse): Promise<HandlerResponse> {
  const contentType = nodeResponse.headers.get('Content-Type')
  let body: string | undefined
  const isBase64Encoded = isBinaryType(contentType)

  if (nodeResponse.body) {
    if (isBase64Encoded) {
      body = await readableStreamToString(nodeResponse.body, 'base64')
    } else {
      body = await nodeResponse.text()
    }
  }

  const multiValueHeaders = nodeResponse.headers.raw()

  return {
    statusCode: nodeResponse.status,
    multiValueHeaders,
    body,
    isBase64Encoded,
  }
}
