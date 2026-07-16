// Pure scheduling decisions for the daily check-in reminder — no DOM, storage, or plugin
// side effects, so it is unit-testable and shared by BOTH the web (foreground Notification)
// and native (Capacitor local-notification) paths.
//
// All day/time math uses the DEVICE's local time. "Remind me at 19:00" means 19:00 where the
// person is, and the per-day de-duplication keys off the local calendar day — so a reminder
// fires once per local day regardless of the device's UTC offset (timezone-safe).

const TIME = /^\d{2}:\d{2}$/

/** The local calendar day as YYYY-MM-DD (not UTC), for once-per-day de-duplication. */
export function localDateKey(now) {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Whether a reminder should fire right now. Pure and total: every guard is explicit —
 * off, already logged today, no permission, an invalid/cleared time, before the chosen
 * time, or already nudged today — otherwise it is due.
 */
export function shouldRemind({ enabled, time, permission, loggedToday, lastNotifiedDate, now }) {
  if (!enabled || loggedToday) return false
  if (permission !== 'granted') return false
  if (!TIME.test(time || '')) return false
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  if (hhmm < time) return false
  if (lastNotifiedDate && lastNotifiedDate === localDateKey(now)) return false
  return true
}

/**
 * The next local occurrence of HH:MM at or after {@code now} — used to schedule a native
 * daily notification. Returns null for an invalid/cleared time.
 */
export function nextReminderAt(time, now) {
  if (!TIME.test(time || '')) return null
  const [hours, minutes] = time.split(':').map(Number)
  const at = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0)
  if (at.getTime() <= now.getTime()) {
    at.setDate(at.getDate() + 1)
  }
  return at
}

/**
 * Neutral reminder text — a nudge to log, never any health detail, so it is safe on a lock
 * screen. Only the pet's own name appears (chosen by the owner, not health content).
 */
export function reminderBody(petName, translate) {
  return translate("Time for {name}'s daily check-in.", { name: petName })
}
