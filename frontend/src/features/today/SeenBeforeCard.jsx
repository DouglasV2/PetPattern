import { ChevronRight } from 'lucide-react'
import { t } from '../../i18n'
import { formatDate } from '../../lib/date'
import { isDismissedStatus } from '../../lib/patterns'

// A quiet "this looks familiar" nudge — shown ONLY when a real pattern has been
// seen more than once and isn't set aside. Never overclaims similarity.
function SeenBeforeCard({ pet, pattern, onShowTimeline }) {
  if (!pattern) return null
  const qualifies = (pattern.seenBefore === true || pattern.detectionCount > 1) && !isDismissedStatus(pattern.status)
  if (!qualifies) return null
  return (
    <section className="seen-before-card" aria-label={t('This looks familiar')}>
      <div className="seen-before-body">
        <p className="seen-before-kicker">{t('This looks familiar')}</p>
        <p className="seen-before-text">
          {t('This looks similar to something you logged before for {name}.', { name: pet.name })}
          {pattern.firstDetectedAt ? ` ${t("You've seen this a few times since {date}.", { date: formatDate(pattern.firstDetectedAt) })}` : ''}
        </p>
      </div>
      <button className="text-button" type="button" onClick={() => onShowTimeline(pattern)}>
        {t('Open case file')} <ChevronRight size={16} />
      </button>
    </section>
  )
}

export { SeenBeforeCard }
