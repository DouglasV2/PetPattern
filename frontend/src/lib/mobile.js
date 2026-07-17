// One-time native shell setup: status-bar style + deep-link routing. Uses the runtime global
// Capacitor plugins (no web-build dependency). No-op on the web.
//
// GENERATED / NOT VERIFIABLE here (no device): the calls are implemented and reviewed but not run.

function isNative() {
  return Boolean(globalThis.Capacitor?.isNativePlatform?.())
}

/**
 * Route native deep links into the SPA's hash router. On the web the browser address bar already
 * carries #reset=<token> / #shared=<token>; on native there is no address bar, so an App/Universal
 * Link arrives via the App plugin's appUrlOpen event and we apply its hash. Returns a cleanup fn.
 *
 * Note: Google sign-in stays a web-redirect flow (it needs a system browser), so it is intentionally
 * not handled as a custom deep link here — see docs/mobile.md.
 */
export function initDeepLinks() {
  const app = globalThis.Capacitor?.Plugins?.App
  if (!app || !isNative()) return () => {}
  let handle
  try {
    handle = app.addListener?.('appUrlOpen', (event) => {
      const url = event?.url
      if (!url) return
      try {
        const parsed = new URL(url)
        if (parsed.hash) {
          // e.g. #reset=<token> or #shared=<token> — hand it to the existing hash routing.
          window.location.hash = parsed.hash
        }
      } catch (err) {
        // ignore unparseable deep links
      }
    })
  } catch (err) {
    return () => {}
  }
  return () => {
    try {
      handle?.remove?.()
    } catch (err) {
      // ignore
    }
  }
}

/**
 * Android hardware back button: navigate the SPA instead of letting the OS background/close the
 * app on every press. Uses the webview history (canGoBack) and the hash router — only exits at the
 * root (Today). Returns a cleanup fn; a no-op on the web / non-native. iOS has no hardware back
 * button, so this listener simply never fires there.
 */
export function initBackButton() {
  const app = globalThis.Capacitor?.Plugins?.App
  if (!app?.addListener || !isNative()) return () => {}
  let handle
  try {
    handle = app.addListener('backButton', ({ canGoBack } = {}) => {
      const hash = window.location.hash
      const atRoot = !hash || hash === '#today' || hash === '#'
      if (canGoBack || !atRoot) {
        window.history.back()
      } else {
        // At the root screen the platform default (minimize/exit) is what users expect.
        app.exitApp?.()
      }
    })
  } catch (err) {
    return () => {}
  }
  return () => {
    try {
      if (handle && typeof handle.remove === 'function') handle.remove()
      else if (typeof handle?.then === 'function') handle.then((h) => h?.remove?.()).catch(() => {})
    } catch (err) {
      // ignore
    }
  }
}

/** Native shell init (status bar + deep links + Android back button). Call once at app start. */
export function initMobile() {
  if (!isNative()) return () => {}
  try {
    // Dark content on the app's light cream background.
    globalThis.Capacitor?.Plugins?.StatusBar?.setStyle?.({ style: 'DARK' })
  } catch (err) {
    // status bar is cosmetic; ignore if unavailable
  }
  const cleanups = [initDeepLinks(), initBackButton()]
  return () => cleanups.forEach((fn) => {
    try { fn?.() } catch (err) { /* ignore */ }
  })
}
