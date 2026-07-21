import { AlertTriangle, ChevronRight, ImagePlus } from 'lucide-react'
import { t } from '../../i18n'
import { isStarterSpecies } from '../../speciesProfiles'
import { starterObservationRows, titleCase } from '../../lib/checkins'
import { formatDate, formatLongDate } from '../../lib/date'
import { foodKindLabel, proteinLabel } from '../../lib/food'
import { VetBlock } from './VetBlock'

function VetSheet({ summary, species, onMedications, checkIns }) {
  const identity = summary.pet
  // Stool is a dog signal; cats track litter box; starter species use the flexible
  // observations model — so gate each dog/cat section by the exact species. Use the
  // real enum code when available (owner view); fall back to the localized display
  // label for the shared-link view, which has no enum client-side.
  const cat = species ? species === 'CAT' : /cat/i.test(identity?.species || '')
  const dog = species ? species === 'DOG' : /dog/i.test(identity?.species || '')
  const starter = species ? isStarterSpecies(species) : !(cat || dog)
  const observationRows = starter ? starterObservationRows(checkIns) : []
  const urgentPatterns = (summary.patterns || []).filter((p) => p.severity === 'urgent')
  return (
    <div className="vet-sheet">
      <section className="vet-block vet-report-head">
        <p className="vet-report-kicker">{t('PetPattern vet summary')}</p>
        <h2>{identity?.name}</h2>
        <p className="vet-identity">
          {[identity?.species, identity?.breed, identity?.ageLabel, identity?.sex, identity?.weightKg ? `${identity.weightKg} kg` : null]
            .filter(Boolean)
            .join(' · ')}
        </p>
        <p className="vet-range">{formatLongDate(summary.rangeStart)} – {formatLongDate(summary.rangeEnd)} ({summary.days} {t('days')})</p>
        <p className="vet-report-note muted">{t('Owner-observed timeline, not a diagnosis.')}</p>
      </section>

      <VetBlock title={t('Owner-observed concern')} tone="key">
        <p>{summary.mainConcern}</p>
      </VetBlock>

      <VetBlock title={t('Recent check-in summary')}>
        <p>{summary.checkInSummary?.narrative}</p>
      </VetBlock>

      <VetBlock title={t('Food & treats')}>
        {summary.currentFood && (
          <p className="vet-current-food">
            <strong>{t('Current main food:')}</strong> {summary.currentFood.label}
            {summary.currentFood.primaryProtein ? ` (${proteinLabel(summary.currentFood.primaryProtein)})` : ''}
            {summary.currentFood.dateStarted ? ` — ${t('since {date}', { date: formatDate(summary.currentFood.dateStarted) })}` : ''}
          </p>
        )}
        {summary.foodChanges?.length ? (
          <ul className="vet-list">
            {summary.foodChanges.map((food, index) => (
              <li key={`${food.dateStarted}-${index}`}>
                <strong>{formatDate(food.dateStarted)}</strong> — {food.label}
                <span className="muted"> ({[foodKindLabel(food.foodKind), food.primaryProtein ? proteinLabel(food.primaryProtein) : null, food.newFood ? t('new food') : null].filter(Boolean).join(', ')})</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">{t('No food changes logged in this period.')}</p>
        )}
      </VetBlock>

      <VetBlock title={t('Medications & care notes')}>
        {summary.medications?.length ? (
          <ul className="vet-list">
            {summary.medications.map((med, index) => (
              <li key={`${med.name}-${index}`}>
                <strong>{med.name}</strong>
                <span className="muted"> — {formatDate(med.startDate)}{med.ongoing ? ` · ${t('ongoing')}` : ` – ${formatDate(med.endDate)}`}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">{t('No medications logged in this period.')}</p>
        )}
        {onMedications && (
          <button className="text-button no-print" type="button" onClick={onMedications}>
            {t('Manage medications')} <ChevronRight size={16} />
          </button>
        )}
      </VetBlock>

      {dog && (
        <VetBlock title={t('Stool changes')}>
          <p>{summary.stoolSummary?.narrative}</p>
          <p className="muted">{t('Normal')}: {summary.stoolSummary?.normalDays} · {t('Soft')}: {summary.stoolSummary?.softDays} · {t('Diarrhea')}: {summary.stoolSummary?.diarrheaDays}</p>
        </VetBlock>
      )}

      {summary.catSignals && (
        <VetBlock title={t('Litter box & behavior')}>
          <p>{summary.catSignals.narrative}</p>
          <p className="muted">
            {t('Litter box changed')}: {summary.catSignals.litterBoxChangedDays} · {t('Not used')}: {summary.catSignals.litterBoxNotUsedDays} · {t('Urination change')}: {summary.catSignals.urinationChangedDays} · {t('Straining')}: {summary.catSignals.strainingDays} · {t('Hiding more')}: {summary.catSignals.hidingMoreDays} · {t('Weight concern')}: {summary.catSignals.weightConcernDays}
          </p>
        </VetBlock>
      )}

      {!starter && (
        <VetBlock title={t('Water, appetite & energy')}>
          <p>{summary.wellbeing?.narrative}</p>
        </VetBlock>
      )}

      {starter && (
        <VetBlock title={t('Species-specific observations')}>
          {observationRows.length ? (
            <ul className="vet-observations-list">
              {observationRows.map((row, index) => (
                <li key={index}><span className="obs-date">{formatDate(row.date)}</span> — {row.text}</li>
              ))}
            </ul>
          ) : (
            <p className="muted">{t('No species-specific observations logged in this period.')}</p>
          )}
        </VetBlock>
      )}

      {summary.visibleChanges && (
        <VetBlock title={t('Visible changes over time')}>
          <p className="muted">{t('Track how this looked over time. Useful to show your vet. Not a diagnosis.')}</p>
          {summary.visibleChanges.entries?.length ? (
            <ul className="vet-list vet-visible-changes">
              {summary.visibleChanges.entries.map((entry, index) => (
                <li key={`${entry.date}-${index}`}>
                  <strong>{formatDate(entry.date)}</strong> — {t(entry.value)}
                  {entry.status && <span className="vc-status"> ({t(titleCase(entry.status))})</span>}
                  {entry.note && <span className="muted"> — {entry.note}</span>}
                  {entry.photoCount > 0 && (
                    <span className="muted vc-photos"> · <ImagePlus size={12} /> {entry.photoCount}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">{summary.visibleChanges.narrative}</p>
          )}
        </VetBlock>
      )}

      <VetBlock title={t('Possible patterns')} tone="key">
        {summary.patterns?.length ? (
          <ul className="vet-list">
            {summary.patterns.map((p, index) => (
              <li key={`${p.type}-${index}`}>
                <span className="pattern-flag">{t('Worth mentioning')}</span>
                <strong> {p.title}</strong>
                <p>{p.summary}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">{t('Nothing stood out clearly in this period.')}</p>
        )}
      </VetBlock>

      <VetBlock title={t('Notes worth discussing')}>
        {summary.ownerNotes?.length ? (
          <ul className="vet-list">
            {summary.ownerNotes.map((note, index) => (
              <li key={`${note.date}-${index}`}><strong>{formatDate(note.date)}</strong> — {note.note}</li>
            ))}
          </ul>
        ) : (
          <p className="muted">{t('No free-text notes in this period.')}</p>
        )}
      </VetBlock>

      {urgentPatterns.length > 0 && (
        <VetBlock title={t('Urgent signs noted')} tone="key">
          {urgentPatterns.map((p, index) => (
            <div className="urgent-banner sev-urgent" role="status" key={`urgent-${index}`}>
              <AlertTriangle size={18} className="urgent-banner-icon" />
              <div>
                <strong>{p.title}</strong>
                {p.urgentNote && <p>{p.urgentNote}</p>}
              </div>
            </div>
          ))}
        </VetBlock>
      )}

      <p className="disclaimer">{summary.disclaimer}</p>
    </div>
  )
}

export { VetSheet }
