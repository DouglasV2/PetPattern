import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { t } from '../../i18n'
import { loadReminder, saveReminder, maybeNotify } from '../../lib/reminders'

function ReminderControl({ pet, loggedToday }) {
  const storageKey = `petpattern.reminder.${pet.id}`
  const [pref, setPref] = useState(() => loadReminder(storageKey))
  const [permission, setPermission] = useState(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  )

  useEffect(() => { setPref(loadReminder(storageKey)) }, [storageKey])
  useEffect(() => { saveReminder(storageKey, pref) }, [storageKey, pref])

  useEffect(() => {
    if (!pref.enabled || permission !== 'granted') return undefined
    maybeNotify(pet, pref, loggedToday, storageKey)
    const id = setInterval(() => maybeNotify(pet, pref, loggedToday, storageKey), 60000)
    return () => clearInterval(id)
  }, [pref, permission, loggedToday, pet, storageKey])

  async function toggle() {
    if (pref.enabled) {
      setPref({ ...pref, enabled: false })
      return
    }
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      const result = await Notification.requestPermission()
      setPermission(result)
    } else if (typeof Notification !== 'undefined') {
      setPermission(Notification.permission)
    }
    setPref({ ...pref, enabled: true })
  }

  return (
    <div className="reminder">
      <button className={pref.enabled ? 'chip-button active-chip' : 'chip-button'} type="button" onClick={toggle}>
        <Bell size={15} /> {pref.enabled ? t('Browser nudge on') : t('Browser nudge')}
      </button>
      {pref.enabled && (
        <label className="reminder-time">
          {t('at')}
          <input type="time" value={pref.time} onChange={(e) => setPref({ ...pref, time: e.target.value || '19:00' })} />
        </label>
      )}
      {pref.enabled && (
        <span className="reminder-note muted">
          {typeof Notification === 'undefined'
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
