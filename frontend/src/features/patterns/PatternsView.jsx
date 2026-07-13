import { ArrowLeft, CalendarRange, Stethoscope } from 'lucide-react'
import { t } from '../../i18n'
import { patternGroup } from '../../lib/patterns'
import { PatternCard } from './PatternCard'

function PatternsView({ pet, patterns, checkIns, foodLogs, recap, onBack, onShowTimeline, onSetStatus, onRecap, onVetSummary, onFoodDetective }) {
  const active = patterns.filter((pattern) => patternGroup(pattern) === 'active')
  const settled = patterns.filter((pattern) => patternGroup(pattern) === 'settled')
  const dismissed = patterns.filter((pattern) => patternGroup(pattern) === 'dismissed')

  return (
    <section className="flow-panel">
      <button className="back-button" type="button" onClick={onBack}><ArrowLeft size={17} /> {t('Back')}</button>
      <p className="kicker">{t('What changed?')}</p>
      <h1>{t('Changes for {name}', { name: pet.name })}</h1>
      <p className="lead">{t('Small things PetPattern noticed from your notes. Nothing here is a diagnosis — just a calmer way to see what changed.')}</p>

      {recap && recap.daysLogged >= 5 && onRecap && (
        <div className="context-cta">
          <button className="ghost-button" type="button" onClick={onRecap}>
            <CalendarRange size={18} /> {t('See your last 30 days')}
          </button>
        </div>
      )}

      <div className="pattern-list">
        {patterns.length === 0 && (
          <article className="panel">
            <h2>{t('No changes to show yet. That\'s okay.')}</h2>
            <p className="muted">{t('Keep logging for a few more days. PetPattern will start showing little changes once there\'s enough history.')}</p>
          </article>
        )}
        {active.map((pattern) => (
          <PatternCard key={pattern.id} pattern={pattern} variant="active" checkIns={checkIns} foodLogs={foodLogs} onShowTimeline={onShowTimeline} onSetStatus={onSetStatus} onVetSummary={onVetSummary} onFoodDetective={onFoodDetective} />
        ))}
      </div>

      {settled.length > 0 && (
        <>
          <p className="kicker section-divider">{t('Settled — not seen recently')}</p>
          <div className="pattern-list">
            {settled.map((pattern) => (
              <PatternCard key={pattern.id} pattern={pattern} variant="settled" onShowTimeline={onShowTimeline} onSetStatus={onSetStatus} />
            ))}
          </div>
        </>
      )}

      {dismissed.length > 0 && (
        <>
          <p className="kicker section-divider">{t('Resolved & set aside')}</p>
          <div className="pattern-list">
            {dismissed.map((pattern) => (
              <PatternCard key={pattern.id} pattern={pattern} variant="dismissed" onShowTimeline={onShowTimeline} onSetStatus={onSetStatus} />
            ))}
          </div>
        </>
      )}

      {onVetSummary && (
        <div className="action-row">
          <button className="primary-button" type="button" onClick={onVetSummary}>
            <Stethoscope size={18} /> {t('Bring this to your vet')}
          </button>
        </div>
      )}
    </section>
  )
}

export { PatternsView }
