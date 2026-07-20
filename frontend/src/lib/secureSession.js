// Native (Capacitor) SECURE session-token storage. The mobile bearer token is kept in the OS secure
// store — iOS Keychain / Android Keystore-backed EncryptedSharedPreferences — via
// `capacitor-secure-storage-plugin` (a real dependency in package.json, Capacitor 8 compatible),
// reached through the runtime `Capacitor.Plugins.SecureStoragePlugin` global so the WEB bundle never
// touches native code. It must be synced into the native projects (`npx cap sync android`).
//
// The API layer needs the token SYNCHRONOUSLY on every request, but secure storage is async, so the
// token lives in an in-memory cache hydrated once at app start (initSecureSession) and kept in sync
// on login / logout. The raw token is NEVER written to localStorage (except to migrate a pre-existing
// legacy value OUT of it, once) and is NEVER logged.
//
// Persistence is OBSERVED, never assumed: secureSessionStatus() reports 'secure' vs 'memory-only',
// and a missing plugin logs an error rather than silently degrading to a session that dies on
// restart. See docs/mobile.md.
//
// GENERATED / NOT VERIFIABLE here (no device): the Keychain/Keystore round-trip is implemented and
// reviewed but not run on a device; the pure cache/migration/status logic below IS unit-tested.

const TOKEN_KEY = 'petpattern.mobileSessionToken'

let tokenCache = null
let hydrated = false

/**
 * Where the token actually lives right now — never assumed, always observed:
 *   'none'        no token held
 *   'secure'      written to (or read from) the OS secure store
 *   'memory-only' held in memory ONLY: the plugin is missing or the write failed, so the
 *                 session will not survive a restart. Callers/QA must be able to see this
 *                 rather than infer that persistence worked.
 */
let secureStatus = 'none'
let warnedMissingPlugin = false

function isNativeApp() {
  return Boolean(globalThis.Capacitor?.isNativePlatform?.())
}

function securePlugin() {
  const plugin = globalThis.Capacitor?.Plugins?.SecureStoragePlugin || null
  if (!plugin && isNativeApp() && !warnedMissingPlugin) {
    warnedMissingPlugin = true
    // Loud and once: a native build without the plugin signs the user out on every cold
    // start. Never let that degrade quietly into "looks fine".
    console.error(
      '[secureSession] capacitor-secure-storage-plugin is NOT available in this native build. '
      + 'The session is held in memory only and will NOT survive an app restart. '
      + 'Run: npm i capacitor-secure-storage-plugin && npx cap sync android'
    )
  }
  return plugin
}

/** Observed persistence state: 'none' | 'secure' | 'memory-only'. */
export function secureSessionStatus() {
  return secureStatus
}

function legacyStorage() {
  try {
    return globalThis.localStorage || null
  } catch (err) {
    return null
  }
}

async function secureGet(plugin, key) {
  try {
    const result = await plugin.get({ key })
    return result?.value || null
  } catch (err) {
    // The plugin rejects when the key is absent — treat that as "no token", not an error.
    return null
  }
}

/**
 * Hydrate the in-memory token from secure storage at app start, migrating a legacy localStorage
 * token into secure storage EXACTLY ONCE (then deleting it from localStorage). Idempotent, and a
 * no-op on the web. Never logs the token.
 */
export async function initSecureSession() {
  if (hydrated) return tokenCache
  hydrated = true
  if (!isNativeApp()) return null
  const plugin = securePlugin()
  const storage = legacyStorage()
  try {
    if (plugin) {
      const secure = await secureGet(plugin, TOKEN_KEY)
      if (secure) {
        tokenCache = secure
        secureStatus = 'secure'
        // A stale copy may still linger in localStorage from a previous build — remove it.
        try { storage?.removeItem(TOKEN_KEY) } catch (err) { /* ignore */ }
        return tokenCache
      }
    }
    // Migration: an older build stored the token in localStorage. Move it into secure storage once.
    const legacy = storage?.getItem?.(TOKEN_KEY) || null
    if (legacy) {
      tokenCache = legacy
      secureStatus = 'memory-only'
      if (plugin) {
        try {
          await plugin.set({ key: TOKEN_KEY, value: legacy })
          secureStatus = 'secure'
          // Only drop the legacy copy AFTER a successful secure write.
          try { storage?.removeItem(TOKEN_KEY) } catch (err) { /* ignore */ }
        } catch (err) {
          // Secure write failed — keep the token in memory so the current session still works, but
          // do NOT delete the legacy copy (nothing was safely persisted). No token value is logged.
          secureStatus = 'memory-only'
          console.warn('[secureSession] secure migration failed; session kept in memory only')
        }
      }
    }
  } catch (err) {
    console.warn('[secureSession] init failed; continuing without a persisted token')
  }
  return tokenCache
}

/** The current mobile session token (in-memory), or null. Synchronous for the API layer. */
export function getSessionToken() {
  return tokenCache
}

/**
 * Persist a new session token to secure storage + the in-memory cache. The cache is set
 * synchronously (before any await) so the very next request already carries the token; the secure
 * write is best-effort. No-op on the web. Never logs the token.
 */
export async function setSessionToken(token) {
  if (!isNativeApp() || !token) return
  tokenCache = token
  hydrated = true
  const plugin = securePlugin()
  const storage = legacyStorage()
  // Never leave the token in plaintext localStorage.
  try { storage?.removeItem(TOKEN_KEY) } catch (err) { /* ignore */ }
  if (!plugin) {
    secureStatus = 'memory-only'
    return
  }
  try {
    await plugin.set({ key: TOKEN_KEY, value: token })
    secureStatus = 'secure'
  } catch (err) {
    secureStatus = 'memory-only'
    console.warn('[secureSession] secure write failed; session kept in memory only')
  }
}

/** Clear the token from secure storage, the in-memory cache, and any legacy localStorage copy. */
export async function clearSessionToken() {
  tokenCache = null
  secureStatus = 'none'
  const plugin = securePlugin()
  const storage = legacyStorage()
  try { storage?.removeItem(TOKEN_KEY) } catch (err) { /* ignore */ }
  if (!plugin) return
  try {
    await plugin.remove({ key: TOKEN_KEY })
  } catch (err) {
    // Absent key / plugin error — nothing to clear or already gone; safe to ignore.
  }
}

/** Test-only: reset module state between tests. */
export function __resetSecureSessionForTest() {
  tokenCache = null
  hydrated = false
  secureStatus = 'none'
  warnedMissingPlugin = false
}
