import { CalendarDays, Check, ClipboardList } from 'lucide-react'
import { t } from '../../i18n'
import { nudgeText } from '../../lib/reminders'
import { ReminderControl } from '../notifications/ReminderControl'

function RetentionStrip({ pet, retention, checkInCount = 0, onLogToday, onQuickLog }) {
  if (!retention) return null
  const { loggedToday, daysSinceLastCheckIn, loggedDaysLast30 } = retention
  // Before there are seven days of history, show a calm "build the baseline"
  // progress instead of a streak — it matches how the pattern engine actually
  // needs about a week before it can compare anything, and it never scolds a
  // missed day. Once the baseline exists, the ordinary stats take over.
  const baselineDays = Math.min(checkInCount, 7)
  const baselineBuilt = checkInCount >= 7
  return (
    <section className={baselineBuilt ? 'retention-strip' : 'retention-strip building'}>
      {baselineBuilt ? (
        <div className="retention-stats">
          <div className="retention-stat">
            <ClipboardList size={18} />
            <div><strong>{checkInCount}</strong><span>{t('baseline days')}</span></div>
          </div>
          <div className="retention-stat">
            <CalendarDays size={18} />
            <div><strong>{loggedDaysLast30}/30</strong><span>{t('days logged')}</span></div>
          </div>
        </div>
      ) : (
        <div className="baseline-hook">
          <div className="baseline-head">
            <CalendarDays size={18} />
            <div className="baseline-copy">
              <strong>{t("Build {name}'s 7-day baseline", { name: pet.name })}</strong>
              <span className="muted">{t('A week of quick notes gives PetPattern enough to start spotting what changed.')}</span>
            </div>
          </div>
          <div className="baseline-track">
            <span className="baseline-dots" aria-hidden="true">
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <span key={i} className={i < baselineDays ? 'baseline-dot on' : 'baseline-dot'} />
              ))}
            </span>
            <span className="baseline-count muted">{t('{done} / 7 baseline days', { done: baselineDays })}</span>
          </div>
        </div>
      )}

      <div className={loggedToday ? 'retention-nudge done' : 'retention-nudge todo'}>
        {loggedToday ? (
          <span><Check size={16} /> {checkInCount > 1 ? t('Logged today — {n} days on record.', { n: checkInCount }) : t("Logged today — that's a start.")}</span>
        ) : (
          <span>{nudgeText(pet, daysSinceLastCheckIn)}</span>
        )}
      </div>

      <ReminderControl pet={pet} loggedToday={loggedToday} />
    </section>
  )
}

export { RetentionStrip }
