import { t } from '../i18n'
import { litterLabel, levelLabel, stoolLabel } from './checkins'

// The headline line for a day in the recent memory, in the signals that species
// actually tracks — a cat never shows "Itching / stool", a dog never shows
// litter box.
export function timelineSummary(item, cat) {
  if (cat) {
    return `${t('Litter box')} ${litterLabel(item.litterBoxUse)} · ${t('Appetite')} ${levelLabel(item.appetiteLevel)}`
  }
  return `${t('Scratching')} ${item.itchingScore ?? t('Not logged')} · ${t('Stool')} ${stoolLabel(item)}`
}

// The small "what else stood out" line, again species-appropriate and translated.
export function timelineFlags(item, cat) {
  const flags = []
  if (item.vomiting) flags.push(t('Vomiting'))
  if (cat) {
    if (item.straining) flags.push(t('Straining'))
    if (item.hidingBehavior === 'MORE') flags.push(t('Hiding more'))
    if (item.weightConcern) flags.push(t('Weight concern'))
    if (item.urinationChange && item.urinationChange !== 'NORMAL' && item.urinationChange !== 'UNKNOWN') {
      flags.push(t('Urination change'))
    }
  } else {
    if (item.stoolState === 'DIARRHEA' || item.diarrhea) flags.push(t('Diarrhea'))
    if (item.earRedness) flags.push(t('Ear redness'))
    if (item.pawLicking) flags.push(t('Paw licking'))
  }
  if (item.freeTextNote) flags.push(item.freeTextNote)
  return flags.length ? flags.join(' · ') : t('Nothing unusual noted')
}
