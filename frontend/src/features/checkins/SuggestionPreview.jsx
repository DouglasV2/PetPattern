import { Check, ChevronRight } from 'lucide-react'
import { t } from '../../i18n'
import { stoolLabel, levelLabel, litterLabel, titleCase, confidenceLabel } from '../../lib/checkins'

function SuggestionPreview({ suggestion, applied, onApply, onAddFood }) {
  const chips = []
  if (suggestion.itchingScore != null) chips.push(`${t('Itching')} ${suggestion.itchingScore}/10`)
  if (suggestion.stoolState && suggestion.stoolState !== 'UNKNOWN') chips.push(`${t('Stool')} ${stoolLabel({ stoolState: suggestion.stoolState })}`)
  if (suggestion.appetiteLevel && suggestion.appetiteLevel !== 'UNKNOWN') chips.push(`${t('Appetite')} ${levelLabel(suggestion.appetiteLevel)}`)
  if (suggestion.waterLevel && suggestion.waterLevel !== 'UNKNOWN') chips.push(`${t('Water')} ${levelLabel(suggestion.waterLevel)}`)
  if (suggestion.energyLevel && suggestion.energyLevel !== 'UNKNOWN') chips.push(`${t('Energy')} ${levelLabel(suggestion.energyLevel)}`)
  if (suggestion.vomiting) chips.push(t('Vomiting'))
  if (suggestion.earRedness) chips.push(t('Ear redness'))
  // Cat-specific chips.
  if (suggestion.litterBoxUse && suggestion.litterBoxUse !== 'UNKNOWN') chips.push(`${t('Litter box')}: ${litterLabel(suggestion.litterBoxUse)}`)
  if (suggestion.urinationChange && suggestion.urinationChange !== 'UNKNOWN') chips.push(`${t('Urination')}: ${t(titleCase(suggestion.urinationChange))}`)
  if (suggestion.straining) chips.push(t('Straining'))
  if (suggestion.hidingBehavior === 'MORE') chips.push(t('Hiding more'))
  if (suggestion.weightConcern) chips.push(t('Weight concern'))
  // Starter-species generic signals (rabbit, bird, reptile, …) and any visible-change
  // note come back as detectedSignals — show them so the preview isn't empty for them.
  for (const signal of suggestion.detectedSignals || []) {
    if (signal && signal.key) chips.push(`${t(signal.label || signal.key)}: ${t(signal.value || 'Changed')}`)
  }

  const trigger = suggestion.possibleFoodTrigger
  const environment = suggestion.possibleEnvironmentTrigger

  return (
    <div className="suggestion">
      <div className="suggestion-top">
        <strong>{t('Suggested fields')}</strong>
        <span className={`confidence ${String(suggestion.confidence || 'low').toLowerCase()}`}>{confidenceLabel(suggestion.confidence || 'low')}</span>
      </div>
      <p className="muted">{t("Nothing's saved until you tap Save today.")}</p>

      {chips.length > 0 ? (
        <div className="chip-row">
          {chips.map((chip) => <span className="chip" key={chip}>{chip}</span>)}
        </div>
      ) : (
        <p className="muted">{t('No clear fields detected. Fill them in below.')}</p>
      )}

      {trigger && (trigger.primaryProtein || trigger.foodKind) && (
        <div className="food-callout">
          <span>{t('Possible food change spotted:')} <strong>{trigger.description || [trigger.primaryProtein, trigger.foodKind].filter(Boolean).map(titleCase).join(' ')}</strong></span>
          <button className="text-button" type="button" onClick={onAddFood}>
            {t('Add as food change')} <ChevronRight size={16} />
          </button>
        </div>
      )}

      {environment && environment.description && (
        <div className="food-callout env-callout">
          <span>{t('Care or environment change mentioned:')} <strong>{environment.description}</strong></span>
        </div>
      )}

      {suggestion.warnings?.length > 0 && (
        <ul className="warning-list">
          {suggestion.warnings.map((warning) => <li key={warning}>{warning}</li>)}
        </ul>
      )}

      <button className="primary-button" type="button" onClick={onApply}>
        {applied ? <><Check size={16} /> {t('Suggestions applied')}</> : t('Use these suggestions')}
      </button>
    </div>
  )
}

export { SuggestionPreview }
