import { ChevronRight, Search, Stethoscope } from 'lucide-react'
import { t } from '../../i18n'
import { formatDate } from '../../lib/date'
import { foodKindLabel, nearbyFoodChanges } from '../../lib/food'
import { statusMeta, settledLine, memoryLine } from '../../lib/patterns'
import { PatternChart } from './PatternChart'

function PatternCard({ pattern, variant, checkIns, foodLogs, onShowTimeline, onSetStatus, onVetSummary, onFoodDetective }) {
  const meta = statusMeta(pattern.status)

  // Settled / dismissed cards stay compact and unchanged — the case-file layout is
  // for the active variant only.
  if (variant !== 'active') {
    return (
      <article className="panel pattern-card dismissed">
        <div className="pattern-top">
          {variant === 'settled'
            ? <span className="status-chip calm">{t('Settled')}</span>
            : meta.label
              ? <span className={`status-chip ${meta.tone}`}>{meta.label}</span>
              : <span className="pattern-flag">{t('Something to notice')}</span>}
        </div>
        <h2>{pattern.title}</h2>
        {variant === 'settled'
          ? <p className="memory-line">{settledLine(pattern)}</p>
          : (memoryLine(pattern) && <p className="memory-line">{memoryLine(pattern)}</p>)}
        <p>{pattern.summary}</p>
        <div className="pattern-actions">
          {variant === 'dismissed' && (
            <button className="chip-button" type="button" onClick={() => onSetStatus(pattern, 'ACKNOWLEDGED')}>{t('Bring back')}</button>
          )}
          {variant === 'settled' && (
            <button className="chip-button subtle" type="button" onClick={() => onSetStatus(pattern, 'NOT_RELEVANT')}>{t('Hide')}</button>
          )}
        </div>
      </article>
    )
  }

  const nearbyFood = nearbyFoodChanges(pattern, foodLogs)
  const seenBefore = pattern.seenBefore && pattern.detectionCount > 1
  return (
    <article className="panel pattern-card case-file-card">
      <div className="pattern-top">
        <span className="case-file-kicker">{t('Pattern case file')}</span>
        {meta.label && <span className={`status-chip ${meta.tone}`}>{meta.label}</span>}
      </div>
      <h2>{pattern.title}</h2>

      <div className="case-file-section">
        <p className="case-file-label">{t('What PetPattern noticed')}</p>
        <p>{pattern.summary}</p>
        {pattern.evidence?.length > 0 && (
          <ul className="evidence-list">
            {pattern.evidence.map((line) => <li key={line}>{line}</li>)}
          </ul>
        )}
      </div>

      {pattern.firstDetectedAt && (
        <div className="case-file-section">
          <p className="case-file-label">{t('Seen before')}</p>
          <p className="case-file-meta">
            {seenBefore
              ? `${t('PetPattern found similar changes across a few logs.')} ${t('Seen a few times since {date}', { date: formatDate(pattern.firstDetectedAt) })}`
              : t('First noticed {date}', { date: formatDate(pattern.firstDetectedAt) })}
          </p>
        </div>
      )}

      <div className="case-file-section">
        <p className="case-file-label">{t('Related signals')}</p>
        <PatternChart pattern={pattern} checkIns={checkIns} foodLogs={foodLogs} />
      </div>

      {nearbyFood.length > 0 && (
        <div className="case-file-section">
          <p className="case-file-label">{t('Food or treat changes nearby')}</p>
          <ul className="case-file-food">
            {nearbyFood.map((f) => (
              <li key={f.id}>
                {formatDate(f.dateStarted)} · {[f.brand, f.productName].filter(Boolean).join(' - ') || foodKindLabel(f.foodKind)}{f.newFood ? ` · ${t('new')}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}

      {pattern.type === 'POSSIBLE_FOOD_TRIGGER' && (
        <p className="pattern-disclaimer muted">{t('This is not an allergy diagnosis. It is a timeline you can discuss with your vet.')}</p>
      )}
      <p className="pattern-disclaimer muted">{t('This is a case file, not a diagnosis.')}</p>

      <div className="case-file-section">
        <p className="case-file-label">{t('Status')}</p>
        <div className="pattern-actions">
          <button className="chip-button primary-chip" type="button" onClick={() => onSetStatus(pattern, 'SHARED_WITH_VET')}>{t('Add to vet summary')}</button>
          <button className="chip-button subtle" type="button" onClick={() => onSetStatus(pattern, 'NOT_RELEVANT')}>{t('Hide')}</button>
        </div>
      </div>

      <div className="action-row case-file-cta">
        <button className="primary-button" type="button" onClick={() => onShowTimeline(pattern)}>
          {t('Open case file')} <ChevronRight size={16} />
        </button>
        {onFoodDetective && pattern.type === 'POSSIBLE_FOOD_TRIGGER' && (
          <button className="secondary-button" type="button" onClick={onFoodDetective}>
            <Search size={18} /> {t('Open food detective')}
          </button>
        )}
        {onVetSummary && (
          <button className="secondary-button" type="button" onClick={onVetSummary}>
            <Stethoscope size={18} /> {t('Bring this to your vet')}
          </button>
        )}
      </div>
    </article>
  )
}

export { PatternCard }
