// Secure native session-token storage (WP2): the bearer token lives in the OS secure store, is
// surfaced via an in-memory cache, migrates once out of legacy localStorage, and never falls back to
// (or leaks into) plaintext localStorage — verified against a mocked SecureStoragePlugin.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  initSecureSession,
  getSessionToken,
  setSessionToken,
  clearSessionToken,
  secureSessionStatus,
  __resetSecureSessionForTest
} from './secureSession'

const TOKEN_KEY = 'petpattern.mobileSessionToken'

let plugin
let store

function installNative(withPlugin = true) {
  store = {}
  plugin = {
    get: vi.fn(({ key }) =>
      key in store ? Promise.resolve({ value: store[key] }) : Promise.reject(new Error('not found'))),
    set: vi.fn(({ key, value }) => { store[key] = value; return Promise.resolve({ value: true }) }),
    remove: vi.fn(({ key }) => { delete store[key]; return Promise.resolve({ value: true }) })
  }
  globalThis.Capacitor = {
    isNativePlatform: () => true,
    Plugins: withPlugin ? { SecureStoragePlugin: plugin } : {}
  }
}

describe('secureSession', () => {
  beforeEach(() => {
    __resetSecureSessionForTest()
    localStorage.clear()
  })
  afterEach(() => {
    delete globalThis.Capacitor
    vi.restoreAllMocks()
  })

  it('saves the token to secure storage and reads it back from the in-memory cache', async () => {
    installNative()
    await setSessionToken('tok-123')
    expect(getSessionToken()).toBe('tok-123')
    expect(plugin.set).toHaveBeenCalledWith({ key: TOKEN_KEY, value: 'tok-123' })
    expect(store[TOKEN_KEY]).toBe('tok-123')
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull() // never in plaintext storage
  })

  it('hydrates an existing secure token on init', async () => {
    installNative()
    store[TOKEN_KEY] = 'secure-tok'
    await initSecureSession()
    expect(getSessionToken()).toBe('secure-tok')
  })

  it('migrates a legacy localStorage token into secure storage exactly once, then deletes it', async () => {
    installNative()
    localStorage.setItem(TOKEN_KEY, 'legacy-tok')
    await initSecureSession()
    expect(getSessionToken()).toBe('legacy-tok')
    expect(store[TOKEN_KEY]).toBe('legacy-tok')             // moved into the secure store
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()      // and removed from localStorage
  })

  it('clears the token from secure storage, the cache, and localStorage on logout', async () => {
    installNative()
    await setSessionToken('tok')
    await clearSessionToken()
    expect(getSessionToken()).toBeNull()
    expect(store[TOKEN_KEY]).toBeUndefined()
    expect(plugin.remove).toHaveBeenCalledWith({ key: TOKEN_KEY })
  })

  it('failure fallback: a secure-write error keeps the session in memory, never in localStorage or the log', async () => {
    installNative()
    plugin.set.mockRejectedValue(new Error('keystore unavailable'))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await setSessionToken('tok-secret')

    expect(getSessionToken()).toBe('tok-secret')            // current session still works
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()      // never falls back to plaintext storage
    const leaked = warn.mock.calls.some((args) => args.some((a) => String(a).includes('tok-secret')))
    expect(leaked).toBe(false)                              // the token value is never logged
  })

  it('migration failure keeps the legacy token in place (nothing was safely persisted)', async () => {
    installNative()
    plugin.set.mockRejectedValue(new Error('keystore unavailable'))
    localStorage.setItem(TOKEN_KEY, 'legacy-tok')

    await initSecureSession()

    expect(getSessionToken()).toBe('legacy-tok')            // usable in memory
    expect(localStorage.getItem(TOKEN_KEY)).toBe('legacy-tok') // NOT deleted — nothing persisted
  })

  it('reports "secure" only when the OS store actually accepted the token', async () => {
    installNative()
    expect(secureSessionStatus()).toBe('none')
    await setSessionToken('tok')
    expect(secureSessionStatus()).toBe('secure')
    await clearSessionToken()
    expect(secureSessionStatus()).toBe('none')
  })

  it('never claims "secure" when the write failed — it reports memory-only', async () => {
    installNative()
    plugin.set.mockRejectedValue(new Error('keystore unavailable'))
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    await setSessionToken('tok')
    expect(getSessionToken()).toBe('tok')          // usable now
    expect(secureSessionStatus()).toBe('memory-only') // but honestly not persisted
  })

  it('never claims "secure" when the plugin is missing, and says so loudly', async () => {
    installNative(false) // native build WITHOUT the secure-storage plugin
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    await setSessionToken('tok')
    expect(secureSessionStatus()).toBe('memory-only')
    expect(err).toHaveBeenCalled()
    const msg = err.mock.calls.flat().join(' ')
    expect(msg).toMatch(/will NOT survive an app restart/i)
    expect(msg).not.toContain('tok') // and still never logs the token
  })

  it('is a no-op on the web (the web app uses an HttpOnly cookie, not a bearer token)', async () => {
    // No Capacitor global at all.
    await setSessionToken('tok')
    expect(getSessionToken()).toBeNull()
    expect(await initSecureSession()).toBeNull()
  })
})
