import { Trash2 } from 'lucide-react'
import { t } from '../../i18n'
import { trialStatusLabel, trialTone } from '../../lib/trials'
import { TrialWindow } from './TrialWindow'

function TrialCard({ trial, onAction, onDelete }) {
  const result = trial.result
  const pct = trial.totalDays > 0 ? Math.min(100, Math.round((100 * trial.dayOfTrial) / trial.totalDays)) : 0
  return (
    <article className={`panel trial-card status-${String(trial.status).toLowerCase()}`}>
      <div className="pattern-top">
        <span className={`status-chip ${trialTone(trial.status)}`}>{trialStatusLabel(trial.status)}</span>
      </div>
      <h2>{t('Leaving out: {protein}', { protein: trial.proteinLabel })}</h2>
      <p className="memory-line">{trial.phase}</p>

      {trial.status === 'ACTIVE' && trial.totalDays > 0 && (
        <>
          <div className="trial-progress"><span style={{ width: `${pct}%` }} /></div>
          {trial.daysLeft != null && <p className="muted">{t('{n} days to go', { n: trial.daysLeft })}</p>}
        </>
      )}

      {result?.hasEnoughData && (
        <div className="trial-windows">
          <TrialWindow label={t('Before')} stat={result.baseline} />
          <TrialWindow label={t('During')} stat={result.elimination} tone="good" />
          {result.reintroduction && <TrialWindow label={t('After')} stat={result.reintroduction} tone="watch" />}
        </div>
      )}

      {result?.verdict && <p className="trial-verdict">{result.verdict}</p>}

      {result && (
        <p className="muted trial-adherence">
          {result.cleanRun
            ? t('Stayed on plan the whole time.')
            : t('Slipped: {list}', { list: result.slips.join(', ') })}
        </p>
      )}

      {trial.notes && <p className="muted">{trial.notes}</p>}

      <div className="pattern-actions">
        {trial.status === 'ACTIVE' && (
          <button className="chip-button" type="button" onClick={() => onAction(trial, 'reintroduce')}>
            {t('Bring {protein} back', { protein: String(trial.proteinLabel).toLowerCase() })}
          </button>
        )}
        {(trial.status === 'ACTIVE' || trial.status === 'REINTRODUCED') && (
          <button className="chip-button" type="button" onClick={() => onAction(trial, 'complete')}>{t('Wrap up')}</button>
        )}
        {(trial.status === 'ACTIVE' || trial.status === 'REINTRODUCED') && (
          <button className="chip-button subtle" type="button" onClick={() => onAction(trial, 'abandon')}>{t('Stop')}</button>
        )}
        <button className="icon-button danger" type="button" aria-label={t('Delete trial')} onClick={() => onDelete(trial)}>
          <Trash2 size={15} />
        </button>
      </div>
    </article>
  )
}

export { TrialCard }
