// Vendored from:
//  - https://github.com/remix-run/remix/blob/8f38118e44298d609224c6074ae6519d385196f1/packages/remix-dev/vite/node-adapter.ts
//  - https://github.com/remix-run/remix/blob/8f38118e44298d609224c6074ae6519d385196f1/packages/remix-node/stream.ts

import type { IncomingHttpHeaders, ServerResponse } from 'node:http'
import { once } from 'node:events'
import { Readable, Stream } from 'node:stream'
import { splitCookiesString } from 'set-cookie-parser'
import type * as Vite from 'vite'

class StreamPump {
  public highWaterMark: number
  public accumalatedSize: number
  private stream: Stream & {
    readableHighWaterMark?: number
    readable?: boolean
    resume?: () => void
    pause?: () => void
    destroy?: (error?: Error) => void
  }
  private controller?: ReadableStreamController<Uint8Array>

  constructor(
    stream: Stream & {
      readableHighWaterMark?: number
      readable?: boolean
      resume?: () => void
      pause?: () => void
      destroy?: (error?: Error) => void
    },
  ) {
    this.highWaterMark = stream.readableHighWaterMark || new Stream.Readable().readableHighWaterMark
    this.accumalatedSize = 0
    this.stream = stream
    this.enqueue = this.enqueue.bind(this)
    this.error = this.error.bind(this)
    this.close = this.close.bind(this)
  }

  size(chunk: Uint8Array) {
    return chunk?.byteLength || 0
  }

  start(controller: ReadableStreamController<Uint8Array>) {
    this.controller = controller
    this.stream.on('data', this.enqueue)
    this.stream.once('error', this.error)
    this.stream.once('end', this.close)
    this.stream.once('close', this.close)
  }

  pull() {
    this.resume()
  }

  cancel(reason?: Error) {
    if (this.stream.destroy) {
      this.stream.destroy(reason)
    }

    this.stream.off('data', this.enqueue)
    this.stream.off('error', this.error)
    this.stream.off('end', this.close)
    this.stream.off('close', this.close)
  }

  enqueue(chunk: Uint8Array | string) {
    if (this.controller) {
      try {
        let bytes = chunk instanceof Uint8Array ? chunk : Buffer.from(chunk)

        let available = (this.controller.desiredSize || 0) - bytes.byteLength
        this.controller.enqueue(bytes)
        if (available <= 0) {
          this.pause()
        }
      } catch (error: any) {
        this.controller.error(
          new Error(
            'Could not create Buffer, chunk must be of type string or an instance of Buffer, ArrayBuffer, or Array or an Array-like Object',
          ),
        )
        this.cancel()
      }
    }
  }

  pause() {
    if (this.stream.pause) {
      this.stream.pause()
    }
  }

  resume() {
    if (this.stream.readable && this.stream.resume) {
      this.stream.resume()
    }
  }

  close() {
    if (this.controller) {
      this.controller.close()
      delete this.controller
    }
  }

  error(error: Error) {
    if (this.controller) {
      this.controller.error(error)
      delete this.controller
    }
  }
}

const createReadableStreamFromReadable = (source: Readable & { readableHighWaterMark?: number }) => {
  let pump = new StreamPump(source)
  let stream = new ReadableStream(pump, pump)
  return stream
}

function fromNodeHeaders(nodeHeaders: IncomingHttpHeaders): Headers {
  let headers = new Headers()

  for (let [key, values] of Object.entries(nodeHeaders)) {
    if (values) {
      if (Array.isArray(values)) {
        for (let value of values) {
          headers.append(key, value)
        }
      } else {
        headers.set(key, values)
      }
    }
  }

  return headers
}

// Based on `createRemixRequest` in packages/remix-express/server.ts
export function fromNodeRequest(nodeReq: Vite.Connect.IncomingMessage): Request {
  let origin =
    nodeReq.headers.origin && 'null' !== nodeReq.headers.origin
      ? nodeReq.headers.origin
      : `http://${nodeReq.headers.host}`
  // Use `req.originalUrl` so Remix is aware of the full path
  if (!nodeReq.originalUrl) throw new Error('Expected `nodeReq.originalUrl` to be defined')
  let url = new URL(nodeReq.originalUrl, origin)
  let init: RequestInit = {
    method: nodeReq.method,
    headers: fromNodeHeaders(nodeReq.headers),
  }

  if (nodeReq.method !== 'GET' && nodeReq.method !== 'HEAD') {
    init.body = createReadableStreamFromReadable(nodeReq)
    ;(init as { duplex: 'half' }).duplex = 'half'
  }

  return new Request(url.href, init)
}

// Adapted from solid-start's `handleNodeResponse`:
// https://github.com/solidjs/solid-start/blob/7398163869b489cce503c167e284891cf51a6613/packages/start/node/fetch.js#L162-L185
export async function toNodeRequest(res: Response, nodeRes: ServerResponse) {
  nodeRes.statusCode = res.status
  nodeRes.statusMessage = res.statusText

  let cookiesStrings = []

  for (let [name, value] of res.headers) {
    if (name === 'set-cookie') {
      cookiesStrings.push(...splitCookiesString(value))
    } else nodeRes.setHeader(name, value)
  }

  if (cookiesStrings.length) {
    nodeRes.setHeader('set-cookie', cookiesStrings)
  }

  if (res.body) {
    // https://github.com/microsoft/TypeScript/issues/29867
    let responseBody = res.body as unknown as AsyncIterable<Uint8Array>
    let readable = Readable.from(responseBody)
    readable.pipe(nodeRes)
    await once(readable, 'end')
  } else {
    nodeRes.end()
  }
}
