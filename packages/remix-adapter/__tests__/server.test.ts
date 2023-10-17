import { describe, it, vi, MockedFunction, afterEach, afterAll, expect } from 'vitest'
import fsp from 'node:fs/promises'
import path from 'node:path'
import lambdaTester from 'lambda-tester'
import { createRequestHandler as createRemixRequestHandler, Response as NodeResponse } from '@remix-run/node'
import type { HandlerEvent } from '@netlify/functions'

import { createRemixHeaders, createRemixRequest, createRequestHandler, sendRemixResponse } from '../src/server'

// We don't want to test that the remix server works here (that's what the
// playwright tests do), we just want to test the netlify adapter
vi.mock('@remix-run/node', async () => {
  const original = await vi.importActual<typeof import('@remix-run/node')>('@remix-run/node')
  return {
    ...original,
    createRequestHandler: vi.fn(),
  }
})
const mockedCreateRequestHandler = createRemixRequestHandler as MockedFunction<typeof createRemixRequestHandler>

function createMockEvent(event: Partial<HandlerEvent> = {}): HandlerEvent {
  return {
    rawUrl: 'http://localhost:3000/',
    rawQuery: '',
    path: '/',
    httpMethod: 'GET',
    headers: {
      host: 'localhost:3000',
    },
    multiValueHeaders: {},
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    body: null,
    isBase64Encoded: false,
    ...event,
  }
}

describe('netlify createRequestHandler', () => {
  describe('basic requests', () => {
    afterEach(() => {
      mockedCreateRequestHandler.mockReset()
    })

    afterAll(() => {
      vi.restoreAllMocks()
    })

    it('handles requests', async () => {
      mockedCreateRequestHandler.mockImplementation(() => async (req) => {
        return new Response(`URL: ${new URL(req.url).pathname}`)
      })

      // @ts-expect-error We don't have a real app to test, but it doesn't matter. We won't ever
      // call through to the real createRequestHandler
      await lambdaTester(createRequestHandler({ build: undefined }))
        .event(createMockEvent({ rawUrl: 'http://localhost:3000/foo/bar' }))
        .expectResolve((res) => {
          expect(res.statusCode).toBe(200)
          expect(res.body).toBe('URL: /foo/bar')
        })
    })

    it('handles root // requests', async () => {
      mockedCreateRequestHandler.mockImplementation(() => async (req) => {
        return new Response(`URL: ${new URL(req.url).pathname}`)
      })

      // @ts-expect-error We don't have a real app to test, but it doesn't matter. We won't ever
      // call through to the real createRequestHandler
      await lambdaTester(createRequestHandler({ build: undefined }))
        .event(createMockEvent({ rawUrl: 'http://localhost:3000//' }))
        .expectResolve((res) => {
          expect(res.statusCode).toBe(200)
          expect(res.body).toBe('URL: //')
        })
    })

    it('handles nested // requests', async () => {
      mockedCreateRequestHandler.mockImplementation(() => async (req) => {
        return new Response(`URL: ${new URL(req.url).pathname}`)
      })

      // @ts-expect-error We don't have a real app to test, but it doesn't matter. We won't ever
      // call through to the real createRequestHandler
      await lambdaTester(createRequestHandler({ build: undefined }))
        .event(createMockEvent({ rawUrl: 'http://localhost:3000//foo//bar' }))
        .expectResolve((res) => {
          expect(res.statusCode).toBe(200)
          expect(res.body).toBe('URL: //foo//bar')
        })
    })

    it('handles root // requests (development)', async () => {
      const oldEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      mockedCreateRequestHandler.mockImplementation(() => async (req) => {
        return new Response(`URL: ${new URL(req.url).pathname}`)
      })

      // @ts-expect-error We don't have a real app to test, but it doesn't matter. We won't ever
      // call through to the real createRequestHandler
      await lambdaTester(createRequestHandler({ build: undefined }))
        .event(createMockEvent({ path: '//' }))
        .expectResolve((res) => {
          expect(res.statusCode).toBe(200)
          expect(res.body).toBe('URL: //')
        })

      process.env.NODE_ENV = oldEnv
    })

    it('handles nested // requests (development)', async () => {
      const oldEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      mockedCreateRequestHandler.mockImplementation(() => async (req) => {
        return new Response(`URL: ${new URL(req.url).pathname}`)
      })

      // @ts-expect-error We don't have a real app to test, but it doesn't matter. We won't ever
      // call through to the real createRequestHandler
      await lambdaTester(createRequestHandler({ build: undefined }))
        .event(createMockEvent({ path: '//foo//bar' }))
        .expectResolve((res) => {
          expect(res.statusCode).toBe(200)
          expect(res.body).toBe('URL: //foo//bar')
        })

      process.env.NODE_ENV = oldEnv
    })

    it('handles null body', async () => {
      mockedCreateRequestHandler.mockImplementation(() => async () => {
        return new Response(null, { status: 200 })
      })

      // @ts-expect-error We don't have a real app to test, but it doesn't matter. We won't ever
      // call through to the real createRequestHandler
      await lambdaTester(createRequestHandler({ build: undefined }))
        .event(createMockEvent({ rawUrl: 'http://localhost:3000' }))
        .expectResolve((res) => {
          expect(res.statusCode).toBe(200)
        })
    })

    it('handles status codes', async () => {
      mockedCreateRequestHandler.mockImplementation(() => async () => {
        return new Response(null, { status: 204 })
      })

      // @ts-expect-error We don't have a real app to test, but it doesn't matter. We won't ever
      // call through to the real createRequestHandler
      await lambdaTester(createRequestHandler({ build: undefined }))
        .event(createMockEvent({ rawUrl: 'http://localhost:3000' }))
        .expectResolve((res) => {
          expect(res.statusCode).toBe(204)
        })
    })

    it('sets headers', async () => {
      mockedCreateRequestHandler.mockImplementation(() => async () => {
        const headers = new Headers({ 'X-Time-Of-Year': 'most wonderful' })
        headers.append('Set-Cookie', 'first=one; Expires=0; Path=/; HttpOnly; Secure; SameSite=Lax')
        headers.append('Set-Cookie', 'second=two; MaxAge=1209600; Path=/; HttpOnly; Secure; SameSite=Lax')
        headers.append(
          'Set-Cookie',
          'third=three; Expires=Wed, 21 Oct 2015 07:28:00 GMT; Path=/; HttpOnly; Secure; SameSite=Lax',
        )

        return new Response(null, { headers })
      })

      // @ts-expect-error We don't have a real app to test, but it doesn't matter. We won't ever
      // call through to the real createRequestHandler
      await lambdaTester(createRequestHandler({ build: undefined }))
        .event(createMockEvent({ rawUrl: 'http://localhost:3000' }))
        .expectResolve((res) => {
          expect(res.multiValueHeaders['x-time-of-year']).toEqual(['most wonderful'])
          expect(res.multiValueHeaders['set-cookie']).toEqual([
            'first=one; Expires=0; Path=/; HttpOnly; Secure; SameSite=Lax',
            'second=two; MaxAge=1209600; Path=/; HttpOnly; Secure; SameSite=Lax',
            'third=three; Expires=Wed, 21 Oct 2015 07:28:00 GMT; Path=/; HttpOnly; Secure; SameSite=Lax',
          ])
        })
    })
  })
})

describe('netlify createRemixHeaders', () => {
  describe('creates fetch headers from netlify headers', () => {
    it('handles empty headers', () => {
      const headers = createRemixHeaders({})
      expect(headers.raw()).toMatchInlineSnapshot(`{}`)
    })

    it('handles simple headers', () => {
      const headers = createRemixHeaders({ 'x-foo': ['bar'] })
      expect(headers.get('x-foo')).toBe('bar')
    })

    it('handles multiple headers', () => {
      const headers = createRemixHeaders({ 'x-foo': ['bar'], 'x-bar': ['baz'] })
      expect(headers.get('x-foo')).toBe('bar')
      expect(headers.get('x-bar')).toBe('baz')
    })

    it('handles headers with multiple values', () => {
      const headers = createRemixHeaders({
        'x-foo': ['bar', 'baz'],
        'x-bar': ['baz'],
      })
      expect(headers.getAll('x-foo')).toEqual(['bar', 'baz'])
      expect(headers.get('x-bar')).toBe('baz')
    })

    it('handles multiple set-cookie headers', () => {
      const headers = createRemixHeaders({
        'set-cookie': [
          '__session=some_value; Path=/; Secure; HttpOnly; MaxAge=7200; SameSite=Lax',
          '__other=some_other_value; Path=/; Secure; HttpOnly; Expires=Wed, 21 Oct 2015 07:28:00 GMT; SameSite=Lax',
        ],
      })
      expect(headers.getAll('set-cookie')).toEqual([
        '__session=some_value; Path=/; Secure; HttpOnly; MaxAge=7200; SameSite=Lax',
        '__other=some_other_value; Path=/; Secure; HttpOnly; Expires=Wed, 21 Oct 2015 07:28:00 GMT; SameSite=Lax',
      ])
    })
  })
})

describe('netlify createRemixRequest', () => {
  it('creates a request with the correct headers', () => {
    const remixRequest = createRemixRequest(createMockEvent({ multiValueHeaders: { Cookie: ['__session=value'] } }))

    expect(remixRequest.method).toBe('GET')
    expect(remixRequest.headers.get('cookie')).toBe('__session=value')
  })
})

describe('sendRemixResponse', () => {
  it('handles regular responses', async () => {
    const response = new NodeResponse('anything')
    const result = await sendRemixResponse(response)
    expect(result.body).toBe('anything')
  })

  it('handles resource routes with regular data', async () => {
    const json = JSON.stringify({ foo: 'bar' })
    const response = new NodeResponse(json, {
      headers: {
        'Content-Type': 'application/json',
        'content-length': json.length.toString(),
      },
    })

    const result = await sendRemixResponse(response)

    expect(result.body).toMatch(json)
  })

  it('handles resource routes with binary data', async () => {
    const image = await fsp.readFile(path.join(__dirname, 'test.jpeg'))

    const response = new NodeResponse(image, {
      headers: {
        'content-type': 'image/jpeg',
        'content-length': image.length.toString(),
      },
    })

    const result = await sendRemixResponse(response)

    expect(result.body).toMatch(image.toString('base64'))
  })
})
