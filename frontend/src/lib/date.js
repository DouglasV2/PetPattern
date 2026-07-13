// Pure date helpers: the app's "today" constant plus parsing/formatting for
// bare 'YYYY-MM-DD' strings (check-in dates, food dates, pattern timestamps).
import { getLang } from '../i18n'

export const today = new Date().toISOString().slice(0, 10)

function dateLocale() {
  return getLang() === 'hr' ? 'hr' : 'en'
}

// Parse a bare 'YYYY-MM-DD' as a LOCAL calendar date. new Date('YYYY-MM-DD')
// parses as UTC midnight, which renders one day early in negative-UTC-offset
// zones — so date-only strings (check-in dates, food dates) must be built from
// local components to label the right day.
export function parseLocalDate(value) {
  if (typeof value === 'string') {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  }
  return new Date(value)
}

// Shift a bare 'YYYY-MM-DD' by n days and return the same string form (local).
export function addDays(isoDate, n) {
  const d = parseLocalDate(isoDate)
  d.setDate(d.getDate() + n)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function formatDate(value) {
  if (!value) return ''
  const date = parseLocalDate(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat(dateLocale(), { month: 'short', day: 'numeric' }).format(date)
}

export function formatLongDate(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat(dateLocale(), { month: 'short', day: 'numeric', year: 'numeric' }).format(parseLocalDate(value))
}
