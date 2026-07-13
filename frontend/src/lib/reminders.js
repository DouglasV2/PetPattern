import { t } from '../i18n'

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
  if (loggedToday || !pref.enabled) return
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  if (!/^\d{2}:\d{2}$/.test(pref.time)) return // ignore a cleared/invalid time
  const now = new Date()
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  if (hhmm < pref.time) return
  const today = now.toISOString().slice(0, 10)
  const notifiedKey = `${key}.notified`
  try {
    if (localStorage.getItem(notifiedKey) === today) return
  } catch (err) {
    return
  }
  // Construct first; only mark the day as done if the notification actually
  // fired, so a browser that throws here doesn't silently swallow the reminder.
  try {
    new Notification('PetPattern', { body: t("Time for {name}'s daily check-in.", { name: pet.name }) })
    try { localStorage.setItem(notifiedKey, today) } catch (err) { /* ignore blocked storage */ }
  } catch (err) {
    // some browsers require a service worker for Notification construction; ignore
  }
}
