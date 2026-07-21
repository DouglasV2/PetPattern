import { ArrowLeft, CalendarRange, Stethoscope } from 'lucide-react'
import { t } from '../../i18n'
import { trendWord } from '../../lib/patterns'
import { RecapStat } from './RecapStat'

function RecapView({ pet, recap, onBack, onVetSummary }) {
  if (!recap) {
    return (
      <section className="flow-panel">
        <button className="back-button" type="button" onClick={onBack}><ArrowLeft size={17} /> {t('Back')}</button>
        <p className="muted">{t('Just a moment…')}</p>
      </section>
    )
  }
  const itching = recap.itching
  return (
    <section className="flow-panel">
      <button className="back-button" type="button" onClick={onBack}><ArrowLeft size={17} /> {t('Back')}</button>
      <p className="kicker">{t('Looking back')}</p>
      <h1>{t("{name}'s last {days} days", { name: pet.name, days: recap.days })}</h1>
      <p className="lead">{recap.headline}</p>
      {recap.factualSummary && <p className="recap-factual">{recap.factualSummary}</p>}

      <div className="recap-grid">
        <RecapStat value={`${recap.daysLogged}/${recap.days}`} label={t('days logged')} />
        <RecapStat value={recap.unchangedDays} label={t('unchanged days')} />
        <RecapStat value={recap.changedDays} label={t('days with a change')} />
      </div>

      {itching.recentAvg != null && (
        <div className="recap-grid recap-grid-itching">
          <RecapStat value={t('{n} days', { n: recap.calmestStreakDays })} label={t('calmest stretch')} />
          <RecapStat value={`${itching.recentAvg}/10`} label={t('avg scratching')} />
        </div>
      )}

      {itching.recentAvg != null && itching.priorAvg != null && itching.label && (
        <article className="panel recap-trend">
          <p>
            {itching.label === 'about the same'
              ? t('Scratching averaged {recent}/10 — about the same as the month before ({prior}/10).', { recent: itching.recentAvg, prior: itching.priorAvg })
              : t('Scratching averaged {recent}/10 — {label} than the month before ({prior}/10).', { recent: itching.recentAvg, label: trendWord(itching.label), prior: itching.priorAvg })}
          </p>
        </article>
      )}

      {recap.vetParagraph && (
        <article className="panel recap-vet-paragraph">
          <div className="panel-heading"><Stethoscope size={18} /><h2>{t('For your vet')}</h2></div>
          <p>{recap.vetParagraph}</p>
        </article>
      )}

      <article className="panel">
        <div className="panel-heading"><CalendarRange size={18} /><h2>{t('Worth noting')}</h2></div>
        {recap.milestones.length ? (
          <ul className="recap-milestones">
            {recap.milestones.map((milestone, index) => (
              <li key={index}><strong>{milestone.label}</strong>{milestone.detail && <span className="muted"> — {milestone.detail}</span>}</li>
            ))}
          </ul>
        ) : (
          <p className="muted">{t('Keep logging — more shows up here as the history grows.')}</p>
        )}
      </article>

      {recap.trackingSuggestion && <p className="recap-suggestion">{recap.trackingSuggestion}</p>}

      <p className="muted recap-did">{t('Food changes: {food} · Photos: {photos} · Trials: {trials}.', { food: recap.foodChanges, photos: recap.photosAdded, trials: recap.trialsRun })}</p>

      <div className="action-row">
        <button className="primary-button" type="button" onClick={onVetSummary}>
          <Stethoscope size={18} /> {t('Bring this to your vet')}
        </button>
      </div>
    </section>
  )
}

export { RecapView }
