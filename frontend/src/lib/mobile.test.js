// Android hardware back-button routing, verified against a mocked Capacitor App plugin. On-device
// behavior is not verifiable here (no emulator); this checks the JS decision: SPA-navigate vs exit.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

let app

function installCapacitor() {
  app = {
    addListener: vi.fn((event, cb) => { app._event = event; app._cb = cb; return { remove: vi.fn() } }),
    exitApp: vi.fn()
  }
  globalThis.Capacitor = { isNativePlatform: () => true, Plugins: { App: app } }
}

describe('initBackButton', () => {
  beforeEach(() => { vi.resetModules(); installCapacitor(); window.location.hash = '' })
  afterEach(() => { delete globalThis.Capacitor; vi.restoreAllMocks() })

  it('registers a backButton listener on native', async () => {
    const { initBackButton } = await import('./mobile')
    initBackButton()
    expect(app.addListener).toHaveBeenCalled()
    expect(app._event).toBe('backButton')
  })

  it('navigates back when the webview has history', async () => {
    const { initBackButton } = await import('./mobile')
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {})
    initBackButton()
    app._cb({ canGoBack: true })
    expect(back).toHaveBeenCalled()
    expect(app.exitApp).not.toHaveBeenCalled()
  })

  it('navigates back when not at the root even without webview history', async () => {
    window.location.hash = '#patterns'
    const { initBackButton } = await import('./mobile')
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {})
    initBackButton()
    app._cb({ canGoBack: false })
    expect(back).toHaveBeenCalled()
    expect(app.exitApp).not.toHaveBeenCalled()
  })

  it('exits only at the root (no history, on Today)', async () => {
    window.location.hash = '#today'
    const { initBackButton } = await import('./mobile')
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {})
    initBackButton()
    app._cb({ canGoBack: false })
    expect(app.exitApp).toHaveBeenCalled()
    expect(back).not.toHaveBeenCalled()
  })

  it('is a safe no-op on the web (returns a cleanup function, no throw)', async () => {
    delete globalThis.Capacitor
    vi.resetModules()
    const { initBackButton } = await import('./mobile')
    expect(typeof initBackButton()).toBe('function')
  })
})
