import type { SignFunction, UnsignFunction } from '@remix-run/server-runtime'

// globalThis.crypto was only introduced in Node.js 20,
// but we still need to support Node v18.
// So we fall back if globalThis.crypto is not available,
// but use globalThis.crypto if it is to keep it browser-compatible.
const getSubtleCrypto = async () => {
  if (globalThis.crypto?.subtle) {
    return globalThis.crypto.subtle
  }

  const { subtle } = await import('node:crypto')
  return subtle
}

const encoder = new TextEncoder()

export const sign: SignFunction = async (value, secret) => {
  const data = encoder.encode(value)
  const key = await createKey(secret, ['sign'])
  const subtleCrypto = await getSubtleCrypto()
  const signature = await subtleCrypto.sign('HMAC', key, data)
  const hash = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=+$/, '')

  return value + '.' + hash
}

export const unsign: UnsignFunction = async (cookie, secret) => {
  const value = cookie.slice(0, cookie.lastIndexOf('.'))
  const hash = cookie.slice(cookie.lastIndexOf('.') + 1)

  const data = encoder.encode(value)
  const key = await createKey(secret, ['verify'])
  const signature = byteStringToUint8Array(atob(hash))
  const subtleCrypto = await getSubtleCrypto()
  const valid = await subtleCrypto.verify('HMAC', key, signature, data)

  return valid ? value : false
}

async function createKey(secret: string, usages: CryptoKey['usages']): Promise<CryptoKey> {
  const subtleCrypto = await getSubtleCrypto()
  const key = await subtleCrypto.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    usages,
  )

  return key
}

function byteStringToUint8Array(byteString: string): Uint8Array {
  const array = new Uint8Array(byteString.length)

  for (let i = 0; i < byteString.length; i++) {
    array[i] = byteString.charCodeAt(i)
  }

  return array
}
