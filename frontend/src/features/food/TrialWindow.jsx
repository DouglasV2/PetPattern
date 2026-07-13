import { t } from '../../i18n'

function TrialWindow({ label, stat, tone }) {
  return (
    <div className={`trial-window ${tone || ''}`}>
      <span className="trial-window-label">{label}</span>
      <strong>{stat.avgItching != null ? `${stat.avgItching}/10` : '—'}</strong>
      <span className="muted">{t('{n} days', { n: stat.loggedDays })}</span>
    </div>
  )
}

export { TrialWindow }
