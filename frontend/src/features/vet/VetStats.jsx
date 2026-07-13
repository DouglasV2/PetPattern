import { t } from '../../i18n'
import { Donut } from './Donut'

// Scannable header stats for the vet summary — days tracked · entries logged · how
// full the record is. On-screen only (no-print); the printable sheet below carries
// the full detail. Mirrors the summary's own range so the numbers always agree.
function VetStats({ summary, checkIns }) {
  const days = summary?.days || 0
  const start = summary?.rangeStart
  const end = summary?.rangeEnd
  const entries = (checkIns || []).filter((c) => (!start || c.checkInDate >= start) && (!end || c.checkInDate <= end)).length
  const pct = days ? Math.min(100, Math.round((entries / days) * 100)) : 0
  return (
    <div className="vet-stats no-print">
      <div className="vet-stat">
        <strong>{days}</strong>
        <span>{t('days tracked')}</span>
      </div>
      <div className="vet-stat">
        <strong>{entries}</strong>
        <span>{t('entries')}</span>
      </div>
      <div className="vet-stat">
        <Donut pct={pct} />
        <span>{t('days filled')}</span>
      </div>
    </div>
  )
}

export { VetStats }
