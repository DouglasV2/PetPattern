// Native (Capacitor) daily-reminder foundation. Accessed through the runtime global
// `Capacitor.Plugins.LocalNotifications` (the same pattern api.js uses for isNativePlatform),
// so the WEB build pulls in no Capacitor plugin dependency and its lockfile is untouched. The
// @capacitor/local-notifications plugin is added only for the native builds (see docs/mobile.md).
//
// GENERATED / NOT VERIFIABLE here: there is no device or emulator in this environment, so the
// scheduling/tap calls below are implemented and reviewed but NOT run on a device. The pure
// decision logic they rely on (reminderSchedule.js) IS unit-tested; native runtime behavior
// (delivery, permission prompts, taps, DST re-anchoring) must be verified on a real build.

import { firstReminderAt, reminderBody, reminderNotificationId } from './reminderSchedule'
import { t } from '../i18n'
import { trackServer, markNotificationOpened } from '../analytics'

function localNotifications() {
  return globalThis.Capacitor?.Plugins?.LocalNotifications || null
}

/** True only on a native platform that actually exposes the local-notifications plugin. */
export function nativeRemindersAvailable() {
  return Boolean(globalThis.Capacitor?.isNativePlatform?.()) && Boolean(localNotifications())
}

/** Request native notification permission. Returns 'granted' | 'denied' | 'unsupported'. */
export async function ensureNativePermission() {
  const plugin = localNotifications()
  if (!plugin) return 'unsupported'
  try {
    const current = await plugin.checkPermissions?.()
    if (current?.display === 'granted') return 'granted'
    const requested = await plugin.requestPermissions?.()
    return requested?.display === 'granted' ? 'granted' : 'denied'
  } catch (err) {
    return 'unsupported'
  }
}

/**
 * Read the CURRENT native permission WITHOUT ever prompting — used on app start / when the reminder
 * control mounts to rehydrate state after a cold restart, so a still-granted permission lets the
 * saved reminder be re-scheduled and a since-revoked one drops the UI out of its "on" state instead
 * of silently doing nothing. Returns 'granted' | 'denied' | 'prompt' | 'unsupported'.
 */
export async function checkNativePermission() {
  const plugin = localNotifications()
  if (!plugin) return 'unsupported'
  try {
    const current = await plugin.checkPermissions?.()
    const display = current?.display
    if (display === 'granted') return 'granted'
    if (display === 'denied') return 'denied'
    return 'prompt'
  } catch (err) {
    return 'unsupported'
  }
}

/**
 * Schedule (or clear) THIS pet's daily reminder to match the owner's preference. Uses a per-pet
 * stable id so multiple pets don't clobber each other, always cancels that pet's previous one
 * first (never stacks), skips today's occurrence when the pet was already logged today, and
 * attaches a safe deep-link payload. The body is neutral (no health detail) so nothing sensitive
 * shows on a lock screen. Returns a status ('scheduled' | 'cancelled' | 'error' | 'unavailable')
 * so the caller can surface a failure instead of it being swallowed silently. A no-op on the web.
 */
export async function syncNativeReminder(pref, petName, options = {}) {
  const plugin = localNotifications()
  if (!plugin) return 'unavailable'
  const id = reminderNotificationId(options.petId)
  try {
    await plugin.cancel?.({ notifications: [{ id }] })
    if (!pref?.enabled) return 'cancelled'
    const at = firstReminderAt(pref.time, new Date(), Boolean(options.loggedToday))
    if (!at) return 'cancelled'
    await plugin.schedule?.({
      notifications: [{
        id,
        title: 'PetPattern',
        body: reminderBody(petName, t),
        schedule: { at, repeats: true, every: 'day' },
        smallIcon: 'ic_stat_icon',
        // Non-sensitive routing payload only — the tap handler deep-links to this pet's check-in.
        extra: { petId: options.petId || null, kind: 'daily-checkin-reminder' }
      }]
    })
    return 'scheduled'
  } catch (err) {
    // Best-effort, but NOT silent: log so a scheduling failure is diagnosable and the caller
    // (ReminderControl) can show a failure note rather than a false "on" state.
    console.warn('[reminder] native schedule failed', err)
    return 'error'
  }
}

/** Cancel THIS pet's native reminder. Returns true if the cancel call was issued. */
export async function cancelNativeReminder(petId) {
  const plugin = localNotifications()
  if (!plugin) return false
  try {
    await plugin.cancel?.({ notifications: [{ id: reminderNotificationId(petId) }] })
    return true
  } catch (err) {
    console.warn('[reminder] native cancel failed', err)
    return false
  }
}

/**
 * Register the "reminder tapped" handler once. When the owner taps a scheduled reminder, this
 * records a privacy-safe open event and deep-links to that pet's safe check-in destination via
 * {@code onOpenCheckIn(petId)}. Returns a cleanup function (or a no-op when unavailable).
 */
export function initReminderTapHandler(onOpenCheckIn) {
  const plugin = localNotifications()
  if (!plugin?.addListener) return () => {}
  let handle
  try {
    handle = plugin.addListener('localNotificationActionPerformed', (event) => {
      const extra = event?.notification?.extra
      if (extra?.kind !== 'daily-checkin-reminder') return
      trackServer('reminder_notification_opened')
      markNotificationOpened()
      if (typeof onOpenCheckIn === 'function') {
        onOpenCheckIn(extra.petId || null)
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
