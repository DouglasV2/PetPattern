// Protective tests for the URL-hash routing helpers: this app has no router
// dependency, so an unrecognized or empty hash must safely fall back to the
// "today" view instead of rendering a blank/broken screen.

import { afterEach, describe, expect, it } from 'vitest'
import { hashView, legalFromHash, resetTokenFromHash, sharedTokenFromHash } from './nav'

afterEach(() => {
  window.location.hash = ''
})

describe('hashView', () => {
  it('defaults to "today" for an empty hash', () => {
    window.location.hash = ''
    expect(hashView()).toBe('today')
  })

  it('defaults to "today" for a hash that is not a known view', () => {
    window.location.hash = '#not-a-real-view'
    expect(hashView()).toBe('today')
  })

  it('returns a whitelisted view as-is', () => {
    window.location.hash = '#patterns'
    expect(hashView()).toBe('patterns')
  })
})

describe('sharedTokenFromHash', () => {
  it('extracts and decodes a shared token', () => {
    window.location.hash = '#shared=abc%20123'
    expect(sharedTokenFromHash()).toBe('abc 123')
  })

  it('returns null when the hash is not a shared link', () => {
    window.location.hash = '#today'
    expect(sharedTokenFromHash()).toBeNull()
  })
})

describe('resetTokenFromHash', () => {
  it('extracts a reset token', () => {
    window.location.hash = '#reset=xyz789'
    expect(resetTokenFromHash()).toBe('xyz789')
  })

  it('returns null when the hash is not a reset link', () => {
    window.location.hash = '#today'
    expect(resetTokenFromHash()).toBeNull()
  })
})

describe('legalFromHash', () => {
  it('recognizes each of the three legal sections', () => {
    for (const section of ['privacy', 'terms', 'disclaimer']) {
      window.location.hash = `#${section}`
      expect(legalFromHash()).toBe(section)
    }
  })

  it('returns null for any other hash', () => {
    window.location.hash = '#today'
    expect(legalFromHash()).toBeNull()
  })
})
