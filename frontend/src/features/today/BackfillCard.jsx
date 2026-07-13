import { useState } from 'react'
import { t } from '../../i18n'
import { today, parseLocalDate, addDays } from '../../lib/date'

// Gentle backfill: if the last log is 2+ days ago and today isn't logged, offer to
// fill up to the last 3 missed days. No guilt, no streaks — every row is skippable.
function BackfillCard({ pet, checkIns, loggedToday, onQuickLog, onLogDay }) {
  const [skipped, setSkipped] = useState([])
  if (!checkIns?.length || loggedToday) return null
  const lastDate = checkIns[0]?.checkInDate
  if (!lastDate) return null
  const daysSince = Math.round((parseLocalDate(today) - parseLocalDate(lastDate)) / 86400000)
  if (daysSince < 2) return null
  const loggedDates = new Set(checkIns.map((c) => c.checkInDate))
  const candidates = [1, 2, 3]
    .map((n) => addDays(today, -n))
    .filter((d) => d > lastDate && !loggedDates.has(d) && !skipped.includes(d))
  if (candidates.length === 0) return null
  const label = (d) => {
    const n = Math.round((parseLocalDate(today) - parseLocalDate(d)) / 86400000)
    return n === 1 ? t('Yesterday') : t('{n} days ago', { n })
  }
  return (
    <section className="backfill-card" aria-label={t('Want to quickly fill the last few days?')}>
      <p className="backfill-title">{t('Want to quickly fill the last few days?')}</p>
      <p className="muted">{t('No pressure — a couple of quiet days help PetPattern learn what is normal for {name}.', { name: pet.name })}</p>
      <div className="backfill-rows">
        {candidates.map((d) => (
          <div className="backfill-row" key={d}>
            <span className="backfill-day">{label(d)}</span>
            <div className="backfill-actions">
              <button className="chip-button" type="button" onClick={() => onQuickLog(d)}>{t('Same as usual')}</button>
              <button className="chip-button" type="button" onClick={() => onLogDay(d)}>{t('Something changed')}</button>
              <button className="chip-button subtle" type="button" onClick={() => setSkipped((s) => [...s, d])}>{t('Skip')}</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export { BackfillCard }
