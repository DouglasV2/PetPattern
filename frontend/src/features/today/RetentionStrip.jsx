import { Check } from 'lucide-react'
import { t } from '../../i18n'
import { nudgeText } from '../../lib/reminders'
import { ReminderControl } from '../notifications/ReminderControl'

function RetentionStrip({ pet, retention, onLogToday, onQuickLog }) {
  if (!retention) return null
  const { loggedToday, daysSinceLastCheckIn } = retention
  // The baseline-building dots and the baseline/days-logged stats used to live
  // here, but that's the same count PatternMemoryProgress now shows as an
  // honest milestone meter — this strip stays focused on the reminder + a
  // quiet "logged today" nudge so the two don't repeat each other.
  return (
    <section className="retention-strip">
      <div className={loggedToday ? 'retention-nudge done' : 'retention-nudge todo'}>
        {loggedToday ? (
          <span><Check size={16} /> {t('Logged today.')}</span>
        ) : (
          <span>{nudgeText(pet, daysSinceLastCheckIn)}</span>
        )}
      </div>

      <ReminderControl pet={pet} loggedToday={loggedToday} />
    </section>
  )
}

export { RetentionStrip }
