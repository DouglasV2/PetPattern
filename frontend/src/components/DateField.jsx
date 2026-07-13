import { CalendarDays } from 'lucide-react'
import { t } from '../i18n'
import { today, addDays, formatDate } from '../lib/date'

// Friendly date entry: Today / Yesterday one-tap chips (the 95% case for a daily
// log) plus an "Other day" chip that still opens the OS calendar for any date and
// shows the chosen day in words. No date-picker dependency.
function DateField({ value, max = today, onChange, label }) {
  const yesterday = addDays(max, -1)
  const isToday = value === max
  const isYesterday = value === yesterday
  const isOther = !isToday && !isYesterday
  return (
    <div className="date-field">
      <button type="button" className={isToday ? 'date-chip active' : 'date-chip'} aria-pressed={isToday} onClick={() => onChange(max)}>
        {t('Today')}
      </button>
      <button type="button" className={isYesterday ? 'date-chip active' : 'date-chip'} aria-pressed={isYesterday} onClick={() => onChange(yesterday)}>
        {t('Yesterday')}
      </button>
      <label className={isOther ? 'date-chip date-chip-cal active' : 'date-chip date-chip-cal'}>
        <CalendarDays size={15} />
        <span>{isOther ? formatDate(value) : t('Choose a date')}</span>
        <input
          type="date"
          value={value || max}
          max={max}
          aria-label={label || t('Date')}
          onClick={(e) => { try { e.currentTarget.showPicker && e.currentTarget.showPicker() } catch { /* falls back to native click */ } }}
          onChange={(e) => { if (e.target.value) onChange(e.target.value) }}
        />
      </label>
    </div>
  )
}

export { DateField }
