// Native (Capacitor) daily-reminder foundation. Accessed through the runtime global
// `Capacitor.Plugins.LocalNotifications` (the same pattern api.js uses for isNativePlatform),
// so the WEB build pulls in no Capacitor plugin dependency and its lockfile is untouched. The
// @capacitor/local-notifications plugin is added only for the native builds (see docs/mobile.md).
//
// GENERATED / NOT VERIFIABLE here: there is no device or emulator in this environment, so the
// scheduling calls below are implemented and reviewed but not run. The pure decision logic they
// rely on (reminderSchedule.js) IS unit-tested.

import { nextReminderAt, reminderBody } from './reminderSchedule'
import { t } from '../i18n'

// A single stable id so re-scheduling REPLACES the reminder instead of stacking duplicates.
const REMINDER_ID = 1001

function localNotifications() {
  return globalThis.Capacitor?.Plugins?.LocalNotifications || null
}

/** True only on a native platform that actually exposes the local-notifications plugin. */
export function nativeRemindersAvailable() {
  return Boolean(globalThis.Capacitor?.isNativePlatform?.()) && Boolean(localNotifications());
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
 * Schedule (or clear) the daily reminder to match the owner's preference. Always cancels the
 * previous one first, so reminders never stack; never schedules when disabled or the time is
 * cleared. The body is neutral (no health detail) so nothing sensitive shows on a lock screen.
 * A no-op on the web.
 */
export async function syncNativeReminder(pref, petName) {
  const plugin = localNotifications()
  if (!plugin) return
  try {
    await plugin.cancel?.({ notifications: [{ id: REMINDER_ID }] })
    if (!pref?.enabled) return
    const at = nextReminderAt(pref.time, new Date())
    if (!at) return
    await plugin.schedule?.({
      notifications: [{
        id: REMINDER_ID,
        title: 'PetPattern',
        body: reminderBody(petName, t),
        schedule: { at, repeats: true, every: 'day' },
        smallIcon: 'ic_stat_icon'
      }]
    })
  } catch (err) {
    // Reminders are best-effort; a scheduling failure must never break the app.
  }
}

export async function cancelNativeReminder() {
  const plugin = localNotifications()
  if (!plugin) return
  try {
    await plugin.cancel?.({ notifications: [{ id: REMINDER_ID }] })
  } catch (err) {
    // ignore
  }
}
