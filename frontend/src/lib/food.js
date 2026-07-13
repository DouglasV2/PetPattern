import { t } from '../i18n'
import { isStarterSpecies, isChangedValue } from '../speciesProfiles'
import { today, addDays } from './date'
import { parseObservations, titleCase, levelLabel, stoolLabel, litterLabel } from './checkins'

export const emptyFood = {
  dateStarted: today,
  foodKind: 'TREAT',
  brand: '',
  productName: '',
  primaryProtein: 'CHICKEN',
  secondaryProteins: [],
  grainFree: false,
  newFood: true,
  notes: ''
}

export const proteinOptions = ['CHICKEN', 'BEEF', 'LAMB', 'SALMON', 'TURKEY', 'DUCK', 'PORK', 'EGG', 'DAIRY', 'OTHER']

export function foodKindLabel(value) {
  return (value ?? 'MAIN_FOOD') === 'TREAT' ? t('Treat') : t('Main food')
}

export function proteinLabel(value) {
  return t(titleCase(value ?? 'UNKNOWN'))
}

// Food/treat changes whose start date sits within (or just before) the pattern's
// detected window — real logs only, never invented, capped at 3 (newest first).
export function nearbyFoodChanges(pattern, foodLogs) {
  if (!pattern?.firstDetectedAt || !foodLogs?.length) return []
  const start = addDays(pattern.firstDetectedAt, -21)
  const end = pattern.lastDetectedAt || today
  return foodLogs
    .filter((f) => f.dateStarted && f.dateStarted >= start && f.dateStarted <= end)
    .slice()
    .sort((a, b) => (a.dateStarted < b.dateStarted ? 1 : -1))
    .slice(0, 3)
}

// Notable (worth-mentioning) signals on a single check-in, species-aware. Only
// flags real changes — never claims a cause. Used by the Food/Environment Detective.
export function foodDetectiveSignals(checkIn, species) {
  const out = []
  if (isStarterSpecies(species)) {
    const obs = parseObservations(checkIn.observationsJson)
    Object.values(obs).forEach((v) => {
      if (v && isChangedValue(v.value)) out.push(`${t(v.label)}: ${t(v.value)}`)
    })
    return out
  }
  const cat = species === 'CAT'
  if (cat) {
    if (checkIn.litterBoxUse && !['NORMAL', 'UNKNOWN'].includes(checkIn.litterBoxUse)) out.push(`${t('Litter box')}: ${litterLabel(checkIn.litterBoxUse)}`)
    if (checkIn.urinationChange && !['NORMAL', 'UNKNOWN'].includes(checkIn.urinationChange)) out.push(`${t('Urination')}: ${t(titleCase(checkIn.urinationChange))}`)
    if (checkIn.straining) out.push(t('Straining'))
    if (checkIn.hidingBehavior === 'MORE') out.push(t('Hiding more'))
    if (checkIn.appetiteLevel === 'LOWER' || checkIn.appetiteLevel === 'REFUSED') out.push(`${t('Appetite')}: ${levelLabel(checkIn.appetiteLevel)}`)
    if (checkIn.waterLevel === 'HIGHER' || checkIn.waterLevel === 'LOWER') out.push(`${t('Water')}: ${levelLabel(checkIn.waterLevel)}`)
    if (checkIn.vomiting) out.push(t('Vomiting'))
    if (checkIn.weightConcern) out.push(t('Weight concern'))
  } else {
    if (checkIn.itchingScore != null && checkIn.itchingScore >= 6) out.push(`${t('Scratching')} ${checkIn.itchingScore}/10`)
    if (checkIn.stoolState === 'SOFT' || checkIn.stoolState === 'DIARRHEA') out.push(`${t('Stool')}: ${stoolLabel(checkIn)}`)
    if (checkIn.vomiting) out.push(t('Vomiting'))
    if (checkIn.appetiteLevel === 'LOWER' || checkIn.appetiteLevel === 'REFUSED') out.push(`${t('Appetite')}: ${levelLabel(checkIn.appetiteLevel)}`)
    if (checkIn.energyLevel === 'LOW' || checkIn.energyLevel === 'RESTLESS') out.push(`${t('Energy')}: ${levelLabel(checkIn.energyLevel)}`)
    if (checkIn.earRedness) out.push(t('Ear redness'))
    if (checkIn.pawLicking) out.push(t('Paw licking'))
  }
  return out
}
