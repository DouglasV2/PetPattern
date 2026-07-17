import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { t } from '../../i18n'
import { trackServer } from '../../analytics'
import { loadReminder, saveReminder, maybeNotify } from '../../lib/reminders'
import {
  nativeRemindersAvailable,
  ensureNativePermission,
  syncNativeReminder,
  cancelNativeReminder
} from '../../lib/nativeNotifications'

function ReminderControl({ pet, loggedToday }) {
  const storageKey = `petpattern.reminder.${pet.id}`
  // On native (Capacitor) we schedule a real daily local notification; on the web we fall back
  // to a foreground Notification while the app is open. Decided once — the platform is stable.
  const native = nativeRemindersAvailable()
  const [pref, setPref] = useState(() => loadReminder(storageKey))
  const [permission, setPermission] = useState(() =>
    native ? 'unsupported' : (typeof Notification !== 'undefined' ? Notification.permission : 'unsupported')
  )
  const [scheduleFailed, setScheduleFailed] = useState(false)

  useEffect(() => { setPref(loadReminder(storageKey)) }, [storageKey])
  useEffect(() => { saveReminder(storageKey, pref) }, [storageKey, pref])

  // Web: check once a minute while the app is open (a native platform skips this entirely
  // so a foreground webview notification never doubles the scheduled native one).
  useEffect(() => {
    if (native || !pref.enabled || permission !== 'granted') return undefined
    maybeNotify(pet, pref, loggedToday, storageKey)
    const id = setInterval(() => maybeNotify(pet, pref, loggedToday, storageKey), 60000)
    return () => clearInterval(id)
  }, [native, pref, permission, loggedToday, pet, storageKey])

  // Native: (re)schedule THIS pet's real daily reminder whenever the preference, permission or
  // today's logged-state changes, and re-anchor on app resume (covers timezone/DST shifts and
  // cold restarts). loggedToday feeds through so today's occurrence is skipped after a check-in —
  // the reminder never fires on a day already logged. Scheduling failures surface (not swallowed).
  useEffect(() => {
    if (!native) return undefined
    let cancelled = false
    async function sync() {
      // An enabled-but-not-granted state must never look "on": don't schedule, don't claim success.
      if (pref.enabled && permission !== 'granted') {
        if (!cancelled) setScheduleFailed(false)
        return
      }
      const status = await syncNativeReminder(pref, pet.name, { petId: pet.id, loggedToday })
      if (!cancelled) setScheduleFailed(status === 'error')
    }
    sync()
    const app = globalThis.Capacitor?.Plugins?.App
    let resumeHandle
    if (app?.addListener) {
      try { resumeHandle = app.addListener('resume', sync) } catch (err) { /* ignore */ }
    }
    return () => {
      cancelled = true
      try {
        if (resumeHandle && typeof resumeHandle.remove === 'function') resumeHandle.remove()
        else if (typeof resumeHandle?.then === 'function') resumeHandle.then((h) => h?.remove?.()).catch(() => {})
      } catch (err) { /* ignore */ }
    }
  }, [native, pref, permission, loggedToday, pet.id, pet.name])

  async function toggle() {
    if (pref.enabled) {
      setPref({ ...pref, enabled: false })
      setScheduleFailed(false)
      if (native) cancelNativeReminder(pet.id)
      return
    }
    // Request permission BEFORE enabling; only turn on when it is actually granted, so a denied
    // permission can never leave a persisted "on" state that quietly does nothing.
    let result
    if (native) {
      result = await ensureNativePermission()
    } else if (typeof Notification === 'undefined') {
      result = 'unsupported'
    } else if (Notification.permission === 'default') {
      result = await Notification.requestPermission()
    } else {
      result = Notification.permission
    }
    setPermission(result)

    if (result === 'granted') {
      trackServer('reminder_permission_granted')
      trackServer('reminder_enabled')
      setPref({ ...pref, enabled: true })
    } else {
      if (result === 'denied') trackServer('reminder_permission_denied')
      // Leave it OFF and let the note explain why nothing turned on.
      setPref({ ...pref, enabled: false })
    }
  }

  const showDeniedNote = permission === 'denied'
  const showUnsupportedNote = !native && typeof Notification === 'undefined'

  return (
    <div className="reminder">
      <button className={pref.enabled ? 'chip-button active-chip' : 'chip-button'} type="button" onClick={toggle}>
        <Bell size={15} /> {pref.enabled
          ? (native ? t('Reminder on') : t('Browser nudge on'))
          : (native ? t('Daily reminder') : t('Browser nudge'))}
      </button>
      {pref.enabled && (
        <label className="reminder-time">
          {t('at')}
          <input type="time" value={pref.time} onChange={(e) => setPref({ ...pref, time: e.target.value || '19:00' })} />
        </label>
      )}
      {pref.enabled && !scheduleFailed && (
        <span className="reminder-note muted">
          {native
            ? t('A daily reminder at your chosen time.')
            : t('Works while PetPattern is open — not an email reminder yet.')}
        </span>
      )}
      {pref.enabled && scheduleFailed && (
        <span className="reminder-note error-text" role="alert">
          {t("The reminder couldn't be scheduled. Try turning it off and on again.")}
        </span>
      )}
      {!pref.enabled && showDeniedNote && (
        <span className="reminder-note error-text" role="alert">
          {native
            ? t('Notifications are blocked — enable them in your device settings to get a daily reminder.')
            : t('Notifications are blocked — enable them in your browser settings to get a nudge.')}
        </span>
      )}
      {!pref.enabled && !showDeniedNote && showUnsupportedNote && (
        <span className="reminder-note muted">{t('This browser does not support reminders.')}</span>
      )}
    </div>
  )
}

export { ReminderControl }
