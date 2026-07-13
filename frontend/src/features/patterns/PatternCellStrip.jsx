import { Leaf } from 'lucide-react'
import { t } from '../../i18n'
import { formatDate } from '../../lib/date'
import { lastDays, changedLabel } from '../../lib/patterns'

function PatternCellStrip({ pattern, checkIns, sig, foodLogs }) {
  const WINDOW = 14
  const days = lastDays(WINDOW)
  const byDate = new Map((checkIns || []).map((c) => [c.checkInDate, c]))
  const foodDates = new Set((foodLogs || []).map((f) => f.dateStarted))
  const cells = days.map((d) => {
    const entry = byDate.get(d.iso)
    const read = entry ? sig.read(entry) : null
    return { iso: d.iso, day: d.date.getDate(), tone: read ? read.tone : 'none', value: read ? read.value : null, food: foodDates.has(d.iso) }
  })
  const logged = cells.filter((c) => c.tone !== 'none').length
  if (logged < 3) {
    return <p className="chart-empty muted">{t('A few more logs will make this easier to see.')}</p>
  }
  return (
    <div className="pattern-chart">
      <div className="pattern-chart-head">
        <span className="pattern-chart-title">{t('Last 2 weeks')}</span>
      </div>
      <div className="cell-days" aria-hidden="true">
        {cells.map((c) => <span key={c.iso}>{c.day}.</span>)}
      </div>
      <div className="cell-strip" role="img" aria-label={sig.label}>
        {cells.map((c) => (
          <span key={c.iso} className={`cell-bar ${c.tone}`}
            title={`${formatDate(c.iso)} · ${c.value ? `${sig.label}: ${c.value}` : t('No check-in')}${c.food ? ` · ${t('food change')}` : ''}`}>
            {c.food ? <Leaf size={11} /> : null}
          </span>
        ))}
      </div>
      <div className="cell-legend muted">
        <span><i className="cell-key calm" />{t('calm')}</span>
        <span><i className="cell-key watch" />{t('mild')}</span>
        <span><i className="cell-key changed" />{changedLabel(pattern.type)}</span>
      </div>
    </div>
  )
}

export { PatternCellStrip }
