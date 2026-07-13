import { useState } from 'react'
import { CalendarDays, Pencil, Search, Trash2 } from 'lucide-react'
import { t } from '../../i18n'
import { formatDate, today } from '../../lib/date'
import { isCat } from '../../lib/species'
import { timelineSummary, timelineFlags } from '../../lib/timeline'

function RecentTimeline({ pet, checkIns, onEdit, onDelete, onLogDay }) {
  const cat = isCat(pet)
  const [findDate, setFindDate] = useState('')
  const [query, setQuery] = useState('')
  if (!checkIns.length) return null
  // Search the recent record by the same words the owner sees on each row —
  // signal labels ("Scratching", "Diarrhea"…) and their own note — so typing
  // "scra" surfaces the scratching days. Localised text, so it works in HR too.
  const q = query.trim().toLowerCase()
  const searchable = (c) => `${formatDate(c.checkInDate)} ${timelineSummary(c, cat)} ${timelineFlags(c, cat)} ${c.freeTextNote || ''}`.toLowerCase()
  const matches = q ? checkIns.filter((c) => searchable(c).includes(q)) : []
  const visible = q ? matches : checkIns.slice(0, 8)
  const found = findDate ? checkIns.find((c) => c.checkInDate === findDate) : null
  return (
    <section className="panel timeline-panel">
      <div className="panel-heading">
        <CalendarDays size={18} />
        <h2>{t('Recent memory')}</h2>
      </div>

      {onLogDay && (
        <div className="find-day no-print">
          <div className="find-day-head">
            <Search size={15} />
            <input type="search" className="find-day-search" value={query}
              placeholder={t('Search a signal or note (e.g. scratching)')}
              onChange={(e) => setQuery(e.target.value)} aria-label={t('Search your notes')} />
            <input type="date" className="find-day-input" max={today} value={findDate}
              onChange={(e) => setFindDate(e.target.value)} aria-label={t('Pick a date')} />
          </div>
          {q ? (
            <p className="find-day-hint muted">{matches.length ? t('Days found: {n}', { n: matches.length }) : t('No days match your search.')}</p>
          ) : !findDate ? (
            <p className="find-day-hint muted">{t('Type to search, or pick a date.')}</p>
          ) : found ? (
            <div className="find-day-result">
              <div className="timeline-main">
                <span>{formatDate(found.checkInDate)}</span>
                <strong>{timelineSummary(found, cat)}</strong>
                <small>{timelineFlags(found, cat)}</small>
              </div>
              <button className="chip-button" type="button" onClick={() => onEdit(found)}>{t('Edit')}</button>
            </div>
          ) : (
            <div className="find-day-result empty">
              <span className="muted">{t('No check-in logged for this day.')}</span>
              <button className="chip-button" type="button" onClick={() => onLogDay(findDate)}>{t('Log this day')}</button>
            </div>
          )}
        </div>
      )}

      <div className="timeline">
        {visible.map((item) => (
          <div className="timeline-row editable" key={item.id}>
            <div className="timeline-main">
              <span>{formatDate(item.checkInDate)}</span>
              <strong>{timelineSummary(item, cat)}</strong>
              <small>{timelineFlags(item, cat)}</small>
            </div>
            {(onEdit || onDelete) && (
              <div className="row-actions">
                {onEdit && (
                  <button className="icon-button" type="button" aria-label={`Edit check-in for ${formatDate(item.checkInDate)}`} onClick={() => onEdit(item)}>
                    <Pencil size={15} />
                  </button>
                )}
                {onDelete && (
                  <button className="icon-button danger" type="button" aria-label={`Delete check-in for ${formatDate(item.checkInDate)}`} onClick={() => onDelete(item)}>
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

export { RecentTimeline }
