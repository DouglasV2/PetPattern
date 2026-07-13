// Protective tests for the privacy contract in analytics.js: only allow-listed
// event names are ever sent, and the payload is exactly { event, ts } — never
// pet names, notes, or any other field. See the comment at the top of
// analytics.js for the full contract this guards.
//
// analytics.js reads VITE_ANALYTICS_URL at module load time (`const ENDPOINT =
// import.meta.env.VITE_ANALYTICS_URL`), so each test stubs the env var, resets
// the module registry, and re-imports the module dynamically — otherwise a
// cached module from an earlier import (or the ambient test env, where the var
// is unset) would make ENDPOINT stale/wrong for the test.

import { afterEach, describe, expect, it, vi } from 'vitest'

async function importTrackWithEndpoint(endpoint) {
  vi.stubEnv('VITE_ANALYTICS_URL', endpoint)
  vi.resetModules()
  const mod = await import('./analytics')
  return mod.track
}

describe('analytics.track', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('does not call sendBeacon for an event that is not on the allow-list', async () => {
    const sendBeacon = vi.fn(() => true)
    vi.stubGlobal('navigator', { sendBeacon })
    const track = await importTrackWithEndpoint('https://example.test/collect')

    track('pet_note_text_typed') // not in analytics.js's ALLOWED set

    expect(sendBeacon).not.toHaveBeenCalled()
  })

  it('sends an allow-listed event with a payload of exactly { event, ts }', async () => {
    const sendBeacon = vi.fn(() => true)
    vi.stubGlobal('navigator', { sendBeacon })
    const track = await importTrackWithEndpoint('https://example.test/collect')

    track('checkin_created')

    expect(sendBeacon).toHaveBeenCalledTimes(1)
    const [url, blob] = sendBeacon.mock.calls[0]
    expect(url).toBe('https://example.test/collect')

    const text = await blob.text()
    const payload = JSON.parse(text)
    expect(Object.keys(payload).sort()).toEqual(['event', 'ts'])
    expect(payload.event).toBe('checkin_created')
    expect(typeof payload.ts).toBe('number')
  })

  it('is a silent no-op when VITE_ANALYTICS_URL is not set, even for an allow-listed event', async () => {
    const sendBeacon = vi.fn(() => true)
    vi.stubGlobal('navigator', { sendBeacon })
    const track = await importTrackWithEndpoint('')

    track('checkin_created')

    expect(sendBeacon).not.toHaveBeenCalled()
  })
})
