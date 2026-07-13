import { PawPrint } from 'lucide-react'
import { t } from '../../i18n'
import { ACTIVITY_TYPES, activityLabel } from '../../lib/activities'

function ActivityQuickAdd({ todayActivities, onAdd, onRemove }) {
  return (
    <section className="panel activity-quickadd" aria-label={t('Log an activity')}>
      <div className="panel-heading">
        <PawPrint size={18} />
        <h2>{t('Log an activity')}</h2>
      </div>
      <div className="activity-chip-row">
        {ACTIVITY_TYPES.map((type) => (
          <button key={type} className="chip activity-add-chip" type="button" onClick={() => onAdd(type)}>
            + {activityLabel(type)}
          </button>
        ))}
      </div>
      {todayActivities?.length ? (
        <div className="activity-today-row">
          {todayActivities.map((a) => (
            <span key={a.id} className="chip activity-logged-chip">
              {activityLabel(a.type)}
              <button className="chip-x" type="button" aria-label={t('Remove')} onClick={() => onRemove(a)}>×</button>
            </span>
          ))}
        </div>
      ) : null}
    </section>
  )
}

export { ActivityQuickAdd }
