import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { t } from '../../i18n'
import { loadReminder, saveReminder, maybeNotify } from '../../lib/reminders'
import { nativeRemindersAvailable, ensureNativePermission, syncNativeReminder } from '../../lib/nativeNotifications'

function ReminderControl({ pet, loggedToday }) {
  const storageKey = `petpattern.reminder.${pet.id}`
  // On native (Capacitor) we schedule a real daily local notification; on the web we fall back
  // to a foreground Notification while the app is open. Decided once — the platform is stable.
  const native = nativeRemindersAvailable()
  const [pref, setPref] = useState(() => loadReminder(storageKey))
  const [permission, setPermission] = useState(() =>
    native ? 'unsupported' : (typeof Notification !== 'undefined' ? Notification.permission : 'unsupported')
  )

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

  // Native: (re)schedule the real daily reminder whenever the preference changes.
  useEffect(() => {
    if (!native) return
    syncNativeReminder(pref, pet.name)
  }, [native, pref, pet.name])

  async function toggle() {
    if (pref.enabled) {
      setPref({ ...pref, enabled: false })
      return
    }
    if (native) {
      setPermission(await ensureNativePermission())
    } else if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      setPermission(await Notification.requestPermission())
    } else if (typeof Notification !== 'undefined') {
      setPermission(Notification.permission)
    }
    setPref({ ...pref, enabled: true })
  }

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
      {pref.enabled && (
        <span className="reminder-note muted">
          {native
            ? (permission === 'granted'
                ? t('A daily reminder at your chosen time.')
                : t('Allow notifications to get a daily reminder.'))
            : typeof Notification === 'undefined'
              ? t('This browser does not support reminders.')
              : permission === 'granted'
                ? t('Works while PetPattern is open — not an email reminder yet.')
                : permission === 'denied'
                  ? t('Notifications are blocked — enable them in your browser settings to get a nudge.')
                  : t('Allow notifications to get a nudge (works while PetPattern is open).')}
        </span>
      )}
    </div>
  )
}

export { ReminderControl }
