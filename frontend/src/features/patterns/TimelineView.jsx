import { Activity, AlertTriangle, ArrowLeft, ClipboardList, Droplets, FlaskConical, HeartPulse, Pill, Stethoscope, Utensils } from 'lucide-react'
import { t } from '../../i18n'
import { formatDate } from '../../lib/date'
import { isProfilePhoto, photoAreaLabel } from '../../lib/photos'

function timelineIcon(type) {
  switch (type) {
    case 'FOOD_STARTED':
      return <Utensils size={15} />
    case 'MEDICATION_STARTED':
    case 'MEDICATION_ENDED':
      return <Pill size={15} />
    case 'ITCHING_CHANGE':
      return <HeartPulse size={15} />
    case 'STOOL_CHANGE':
    case 'WATER_CHANGE':
      return <Droplets size={15} />
    case 'NOTE':
      return <ClipboardList size={15} />
    case 'PATTERN_DETECTED':
      return <Activity size={15} />
    default:
      return <AlertTriangle size={15} />
  }
}

function TimelineView({ pet, pattern, timeline, loading, photos, onBack, onVetSummary, onTrial }) {
  // Covers the loading state and the direct-hash-load case (no selected pattern
  // yet), so the recovery redirect never flashes the empty story panel.
  if ((loading && !timeline) || (!pattern && !timeline)) {
    return (
      <section className="flow-panel">
        <button className="back-button" type="button" onClick={onBack}><ArrowLeft size={17} /> {t('Back')}</button>
        <p className="muted">{t("Pulling together {name}'s days…", { name: pet.name })}</p>
      </section>
    )
  }

  const headline = pattern?.title ?? timeline?.patternTitle
  const events = timeline?.events ?? []
  const photosByDate = {}
  ;(photos ?? []).filter((photo) => !isProfilePhoto(photo)).forEach((photo) => {
    const key = (photo.capturedDate ?? '').slice(0, 10)
    if (!key) return
    ;(photosByDate[key] = photosByDate[key] || []).push(photo)
  })
  // Show a day's photos only once — on the first event of that day.
  const firstEventIndexByDate = {}
  events.forEach((event, index) => {
    const key = (event.date ?? '').slice(0, 10)
    if (key && firstEventIndexByDate[key] === undefined) firstEventIndexByDate[key] = index
  })

  return (
    <section className="flow-panel">
      <button className="back-button" type="button" onClick={onBack}><ArrowLeft size={17} /> {t('Back')}</button>
      <p className="kicker">{t('What changed?')}</p>
      <h1>{timeline?.title ?? t('What happened before it?')}</h1>
      <p className="lead">{timeline?.subtitle ?? t("PetPattern looks at the days before {name}'s signals changed.", { name: pet.name })}</p>

      {timeline?.severity === 'urgent' && timeline?.urgentNote && (
        <div className="urgent-banner sev-urgent" role="status" aria-live="polite">
          <AlertTriangle size={18} className="urgent-banner-icon" aria-hidden="true" />
          <div>
            <strong>{t('Worth acting on soon')}</strong>
            <p>{timeline.urgentNote}</p>
          </div>
        </div>
      )}

      {headline && (
        <article className="panel pattern-card">
          <div className="pattern-top">
            <span className="pattern-flag">{t('Something to notice')}</span>
            <Activity size={17} />
          </div>
          <h2>{headline}</h2>
          {pattern?.seenBefore && (
            <p className="memory-line">{t('Noticed in more than one separate stretch since {date}', { date: formatDate(pattern.firstDetectedAt) })}</p>
          )}
          {timeline?.summary && <p>{timeline.summary}</p>}
          {timeline?.ownerExplanation && <p className="owner-explanation">{timeline.ownerExplanation}</p>}
        </article>
      )}

      {timeline?.empty || events.length === 0 ? (
        <article className="panel">
          <h2>{t('Not much of a story yet — that\'s fine.')}</h2>
          <p className="muted">{timeline?.emptyMessage ?? t('A few more quiet days help too — they teach the app what normal looks like.')}</p>
        </article>
      ) : (
        <div className="story">
          {events.map((event, index) => (
            <div className={`story-row sev-${event.severity ?? 'info'}`} key={`${event.date}-${event.type}-${index}`}>
              <div className="story-rail">
                <span className="story-dot">{timelineIcon(event.type)}</span>
              </div>
              <div className="story-body">
                <span className="story-date">{formatDate(event.date)}</span>
                <strong>{event.title}</strong>
                <p>{event.summary}</p>
                {firstEventIndexByDate[(event.date ?? '').slice(0, 10)] === index
                  && photosByDate[(event.date ?? '').slice(0, 10)]?.length > 0 && (
                  <div className="story-thumbs">
                    {photosByDate[(event.date ?? '').slice(0, 10)].map((photo) => (
                      <img key={photo.id} className="story-thumb" src={photo.imageUrl} alt={photo.caption || photoAreaLabel(photo.area)} loading="lazy" />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {(pattern?.type ?? timeline?.type) === 'POSSIBLE_FOOD_TRIGGER' && (
        <p className="pattern-disclaimer muted">{t('This lines up food changes with what was logged afterward — not a diagnosis.')}</p>
      )}
      <p className="muted">{t('Going to the vet? Bring the timeline, not your memory.')}</p>
      <div className="action-row">
        <button className="primary-button" type="button" onClick={onVetSummary}>
          <Stethoscope size={18} /> {t('Bring this to your vet')}
        </button>
        {(pattern?.type ?? timeline?.type) === 'POSSIBLE_FOOD_TRIGGER' && onTrial && (
          <button className="secondary-button" type="button" onClick={onTrial}>
            <FlaskConical size={18} /> {t('Track a food change')}
          </button>
        )}
      </div>

      {timeline?.medicalDisclaimer && <p className="disclaimer">{timeline.medicalDisclaimer}</p>}
    </section>
  )
}

export { TimelineView }
