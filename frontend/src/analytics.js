// Privacy-first product analytics.
//
// Purpose: measure the activation/retention funnel (did people register, add a
// pet, log a check-in, look at their patterns / vet summary, export, delete) —
// NOT to collect anything about the pet or its health.
//
// What is sent: only a fixed event name + a timestamp. Never pet names, notes,
// symptoms/signs, emails, or any health content. Anything not on the allow-list
// below is dropped, so a stray call can't accidentally introduce a new field.
//
// It is OFF unless VITE_ANALYTICS_URL is set, so dev is a silent no-op. The URL
// should point at a privacy-friendly collector (self-hosted, or a Plausible-style
// endpoint) that accepts a JSON body of { event, ts }.

const ENDPOINT = import.meta.env.VITE_ANALYTICS_URL

const ALLOWED = new Set([
  'registered',
  'pet_created',
  'checkin_created',
  'pattern_viewed',
  'vet_summary_viewed',
  'export_clicked',
  'account_deleted'
])

export function track(event) {
  if (!ENDPOINT || !ALLOWED.has(event)) return
  try {
    const body = JSON.stringify({ event, ts: Date.now() })
    // sendBeacon survives page navigation (e.g. after account deletion) and never
    // blocks the UI; fall back to keepalive fetch where it's unavailable.
    if (navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }))
    } else {
      fetch(ENDPOINT, {
        method: 'POST',
        body,
        headers: { 'Content-Type': 'application/json' },
        keepalive: true
      }).catch(() => {})
    }
  } catch {
    // Analytics must never break the app.
  }
}

// Internal funnel events the CLIENT knows (which button, which permission result). Sent to the
// app's own privacy-safe ingest (`/api/analytics/events`) for the signed-in owner. Must be
// non-once-per-ref (the server rejects milestone types), and carry no PII — the server also
// strips any disallowed meta per event type. Fire-and-forget; never blocks or breaks the app.
const SERVER_ALLOWED = new Set([
  'same_as_usual_checkin',
  'changed_day_checkin',
  'weekly_overview_viewed',
  'photo_timeline_used',
  'vet_summary_shared',
  'reminder_enabled',
  'reminder_permission_granted',
  'reminder_permission_denied',
  'reminder_notification_opened',
  'notification_to_checkin'
])

export function trackServer(event, meta) {
  if (!SERVER_ALLOWED.has(event)) return
  try {
    const platform = globalThis.Capacitor?.getPlatform?.() || 'web'
    // Lazy import keeps analytics decoupled from the api module's load order.
    import('./api')
      .then(({ api }) => api.trackEvent({ type: event, platform, meta: meta || undefined }).catch(() => {}))
      .catch(() => {})
  } catch {
    // Analytics must never break the app.
  }
}

// Notification -> check-in conversion attribution. A tapped reminder marks a timestamp; the next
// check-in within the window "consumes" it and reports the conversion exactly once. No content is
// stored — just whether a recent tap preceded a check-in.
let notificationOpenedAt = 0

export function markNotificationOpened() {
  notificationOpenedAt = Date.now()
}

export function consumeNotificationConversion(windowMs = 30 * 60 * 1000) {
  if (notificationOpenedAt && Date.now() - notificationOpenedAt <= windowMs) {
    notificationOpenedAt = 0
    return true
  }
  return false
}
