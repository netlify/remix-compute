import { describe, expect, it } from 'vitest'
import { isBinaryType } from '../src/binary-types'

describe('architect isBinaryType', () => {
  it('should detect binary contentType correctly', () => {
    expect(isBinaryType(undefined)).toBe(false)
    expect(isBinaryType(null)).toBe(false)
    expect(isBinaryType('text/html; charset=utf-8')).toBe(false)
    expect(isBinaryType('application/octet-stream')).toBe(true)
    expect(isBinaryType('application/octet-stream; charset=test')).toBe(true)
  })
})
