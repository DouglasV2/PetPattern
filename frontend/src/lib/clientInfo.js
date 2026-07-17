// Small, dependency-free client descriptors shared by the API layer (request headers) and the
// analytics layer (event body): which platform the app is running on and the build's app version.
// Both are validated server-side (platform against an allow-list, appVersion against a version-shape
// regex), so a bad value can never become a data sink — these are best-effort hints only.

/** 'web' | 'android' | 'ios'. Falls back to 'web' off a native shell. */
export function platform() {
  try {
    return globalThis.Capacitor?.getPlatform?.() || 'web'
  } catch (err) {
    return 'web'
  }
}

/**
 * The build's app version. Injected at build time from package.json via a Vite `define`
 * (`__APP_VERSION__`, see vite.config.js). Falls back to 'unknown' when not injected (e.g. a raw
 * test run) — `typeof` guards a never-defined identifier without throwing.
 */
export function appVersion() {
  try {
    // eslint-disable-next-line no-undef
    if (typeof __APP_VERSION__ !== 'undefined' && __APP_VERSION__) {
      // eslint-disable-next-line no-undef
      return String(__APP_VERSION__)
    }
  } catch (err) {
    // ignore
  }
  return 'unknown'
}
