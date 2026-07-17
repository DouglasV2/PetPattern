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
 * The datetime to anchor the recurring native reminder at. Same as {@link nextReminderAt}, but
 * if the pet has ALREADY been logged today, today's occurrence is skipped and the first fire is
 * pushed to the next day — so the recurring reminder never nags on a day the owner already
 * completed. The daily recurrence (the chosen time) is preserved. Returns null for a cleared time.
 */
export function firstReminderAt(time, now, loggedToday) {
  const at = nextReminderAt(time, now)
  if (!at) return null
  if (loggedToday && localDateKey(at) === localDateKey(now)) {
    at.setDate(at.getDate() + 1)
  }
  return at
}

/**
 * A deterministic, stable positive notification id for a pet, so each pet gets its OWN native
 * reminder slot (no cross-pet clobbering) and re-scheduling REPLACES that pet's reminder instead
 * of stacking. Same pet id -> same slot across app restarts.
 */
export function reminderNotificationId(petId) {
  const source = String(petId || '')
  let hash = 0
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) | 0
  }
  // Keep it well inside a safe 32-bit positive range and away from 0.
  return 1000 + (Math.abs(hash) % 2000000000)
}

/**
 * Neutral reminder text — a nudge to log, never any health detail, so it is safe on a lock
 * screen. Only the pet's own name appears (chosen by the owner, not health content).
 */
export function reminderBody(petName, translate) {
  return translate("Time for {name}'s daily check-in.", { name: petName })
}
