import { t } from '../i18n'
import { shouldRemind, localDateKey, reminderBody } from './reminderSchedule'

export function nudgeText(pet, daysSince) {
  if (daysSince == null) return t("Start {name}'s memory with a quick check-in.", { name: pet.name })
  if (daysSince <= 1) return t("Add today's check-in so {name}'s record stays complete.", { name: pet.name })
  return t("It's been {n} days since {name}'s last note — a quick one keeps the picture clear.", { n: daysSince, name: pet.name })
}

export function loadReminder(key) {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return { enabled: false, time: '19:00', ...JSON.parse(raw) }
  } catch (err) {
    // ignore unreadable/blocked storage
  }
  return { enabled: false, time: '19:00' }
}

export function saveReminder(key, pref) {
  try {
    localStorage.setItem(key, JSON.stringify({ enabled: pref.enabled, time: pref.time }))
  } catch (err) {
    // ignore blocked storage
  }
}

export function maybeNotify(pet, pref, loggedToday, key) {
  const notifiedKey = `${key}.notified`
  let lastNotified = null
  try {
    lastNotified = localStorage.getItem(notifiedKey)
  } catch (err) {
    return // storage blocked — can't de-dup safely, so don't risk a repeat nudge
  }
  const permission = typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
  const now = new Date()
  if (!shouldRemind({
    enabled: pref.enabled,
    time: pref.time,
    permission,
    loggedToday,
    lastNotifiedDate: lastNotified,
    now
  })) {
    return
  }
  // Construct first; only mark the day as done if the notification actually
  // fired, so a browser that throws here doesn't silently swallow the reminder.
  try {
    new Notification('PetPattern', { body: reminderBody(pet.name, t) })
    try { localStorage.setItem(notifiedKey, localDateKey(now)) } catch (err) { /* ignore blocked storage */ }
  } catch (err) {
    // some browsers require a service worker for Notification construction; ignore
  }
}
