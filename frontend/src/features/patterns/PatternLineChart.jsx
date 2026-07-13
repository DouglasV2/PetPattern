import { t } from '../../i18n'
import { formatDate } from '../../lib/date'
import { proteinLabel } from '../../lib/food'
import { lastDays } from '../../lib/patterns'

function PatternLineChart({ pattern, checkIns, foodLogs }) {
  const WINDOW = 30
  const days = lastDays(WINDOW)
  const scoreByDate = new Map((checkIns || []).map((c) => [c.checkInDate, c.itchingScore]))
  const logged = days.filter((d) => scoreByDate.get(d.iso) != null).length
  if (logged < 3) {
    return <p className="chart-empty muted">{t('A few more logs will make this easier to see.')}</p>
  }
  const relatedFood = (foodLogs || []).find((f) => f.id === pattern.relatedFoodLogId)
  const proteinName = relatedFood ? proteinLabel(relatedFood.primaryProtein) : t('Food')
  const foodDates = new Set((foodLogs || []).map((f) => f.dateStarted))

  const W = 300
  const H = 84
  const padT = 12
  const padB = 6
  const n = days.length
  const xAt = (i) => (i / (n - 1)) * W
  const yAt = (s) => padT + (1 - Math.max(0, Math.min(10, s)) / 10) * (H - padT - padB)
  const pts = days
    .map((d, i) => { const s = scoreByDate.get(d.iso); return s == null ? null : { x: xAt(i), y: yAt(s) } })
    .filter(Boolean)
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const foodMarks = days.map((d, i) => (foodDates.has(d.iso) ? xAt(i) : null)).filter((x) => x != null)
  const tickIdx = [0, Math.round(n * 0.2), Math.round(n * 0.4), Math.round(n * 0.6), Math.round(n * 0.8), n - 1]

  return (
    <div className="pattern-chart">
      <div className="pattern-chart-head">
        <span className="pattern-chart-title">{t('Last {n} days', { n: WINDOW })}</span>
        <span className="pattern-chart-legend">
          <span><i className="chart-key dot" />{proteinName}</span>
          <span><i className="chart-key line" />{t('Scratching')}</span>
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="pattern-chart-svg" role="img" aria-label={t('Scratching')}>
        {[0, 5, 10].map((s) => (
          <line key={`g${s}`} x1="0" x2={W} y1={yAt(s).toFixed(1)} y2={yAt(s).toFixed(1)} className="chart-grid-line" />
        ))}
        {foodMarks.map((x, i) => (
          <line key={i} x1={x.toFixed(1)} x2={x.toFixed(1)} y1={padT} y2={H - padB} className="chart-food-line" />
        ))}
        <path d={linePath} className="chart-line-path" />
        {pts.map((p, i) => (
          <circle key={`d${i}`} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="2.1" className="chart-dot" />
        ))}
        {foodMarks.map((x, i) => (
          <circle key={i} cx={x.toFixed(1)} cy={padT} r="3.4" className="chart-food-dot" />
        ))}
      </svg>
      <div className="pattern-chart-axis">
        {tickIdx.map((i) => <span key={i}>{formatDate(days[i].iso)}</span>)}
      </div>
    </div>
  )
}

export { PatternLineChart }
