import { t } from '../i18n'
import { isChangedValue } from '../speciesProfiles'
import { today } from './date'

export const emptyCheckIn = {
  checkInDate: today,
  itchingScore: 2,
  stoolState: 'NORMAL',
  appetiteLevel: 'NORMAL',
  waterLevel: 'NORMAL',
  energyLevel: 'NORMAL',
  vomiting: false,
  earRedness: false,
  pawLicking: false,
  freeTextNote: ''
}

// Carry a steady level forward, falling back to NORMAL when it was unknown.
export function keep(level) {
  return level && level !== 'UNKNOWN' ? level : 'NORMAL'
}

// A fresh check-in seeded only with the fields that species actually tracks, so a
// cat never carries dog signals (scratching/stool) and vice-versa.
export function emptyCheckInFor(species) {
  // Starter species (rabbit, bird, …) track via the flexible observations model,
  // not the dog/cat columns. `observations` is a { key: {label,value,severity,note} }
  // map, serialized to observationsJson on save.
  if (species && species !== 'DOG' && species !== 'CAT') {
    return { checkInDate: today, freeTextNote: '', observations: {} }
  }
  // `observations` also carries the universal Visible Change / Wound signal, so
  // dog/cat check-ins can hold one alongside their explicit columns.
  const base = { checkInDate: today, appetiteLevel: 'NORMAL', waterLevel: 'NORMAL', energyLevel: 'NORMAL', vomiting: false, freeTextNote: '', observations: {} }
  if (species === 'CAT') {
    return { ...base, litterBoxUse: 'NORMAL', urinationChange: 'NORMAL', straining: false, hidingBehavior: 'NORMAL', weightConcern: false }
  }
  return { ...base, itchingScore: 2, stoolState: 'NORMAL', earRedness: false, pawLicking: false }
}

// Serialize a starter-species check-in form's observations map to the JSON string
// the backend stores. Returns null when nothing was recorded.
export function toObservationsJson(form, species) {
  const obs = form.observations || {}
  const signals = Object.entries(obs)
    .filter(([, v]) => v && (v.value || v.note))
    .map(([key, v]) => {
      const signal = { key, label: v.label || key, value: v.value || '' }
      if (v.severity) signal.severity = v.severity
      if (v.status) signal.status = v.status
      if (v.area) signal.area = v.area
      if (v.note) signal.note = v.note
      return signal
    })
  return signals.length ? JSON.stringify({ species, signals }) : null
}

// Parse a stored observationsJson back into the form's observations map (for edit).
export function parseObservations(json) {
  if (!json) return {}
  try {
    const parsed = JSON.parse(json)
    const out = {}
    for (const s of parsed.signals || []) {
      if (s.key) out[s.key] = { label: s.label || s.key, value: s.value || '', severity: s.severity || null, status: s.status || null, area: s.area || null, note: s.note || '' }
    }
    return out
  } catch (err) {
    return {}
  }
}

// Recent starter-species observations for the vet summary — one row per check-in
// that logged a changed signal (owner-observed facts only, never a diagnosis).
export function starterObservationRows(checkIns) {
  return (checkIns || [])
    .map((c) => {
      const obs = parseObservations(c.observationsJson)
      // Visible changes get their own "Visible changes over time" section.
      const changed = Object.entries(obs)
        .filter(([key, v]) => key !== 'visible_change' && v && isChangedValue(v.value))
        .map(([, v]) => v)
      if (!changed.length) return null
      const text = changed.map((v) => `${v.label ? `${t(v.label)}: ` : ''}${t(v.value)}`).join(', ')
      return { date: c.checkInDate, text }
    })
    .filter(Boolean)
    .slice(0, 20)
}

// "Something changed" guided flow — species-specific categories. Selecting a chip
// reveals only the fields that category maps to (see guidedTokens), so a changed
// day never means the whole form. Labels are English keys for t(). Keep the field
// controls below in sync with the full form (which stays the canonical copy).
export const CHANGED_CATEGORIES = {
  DOG: [
    { key: 'skin', label: 'Scratching / skin' },
    { key: 'stool', label: 'Stool' },
    { key: 'appetite', label: 'Appetite' },
    { key: 'water', label: 'Water' },
    { key: 'energy', label: 'Energy' },
    { key: 'vomiting', label: 'Vomiting' },
    { key: 'ear_paws', label: 'Ear / paws' },
    { key: 'food', label: 'Food or treats' },
    { key: 'medication', label: 'Medication' },
    { key: 'other', label: 'Other' }
  ],
  CAT: [
    { key: 'litter', label: 'Litter box' },
    { key: 'urination', label: 'Urination' },
    { key: 'appetite', label: 'Appetite' },
    { key: 'water', label: 'Water' },
    { key: 'energy', label: 'Energy' },
    { key: 'hiding', label: 'Hiding' },
    { key: 'vomiting', label: 'Vomiting' },
    { key: 'weight', label: 'Weight concern' },
    { key: 'food', label: 'Food' },
    { key: 'medication', label: 'Medication' },
    { key: 'other', label: 'Other' }
  ]
}

// Which fields each "what changed?" category reveals, unioned across the selected
// categories and de-duplicated, so two categories that both touch appetite show
// it once. food/medication/other add CTAs (handled in GuidedFieldsForCategory).
export function guidedTokens(categories, cat) {
  const set = new Set()
  const add = (...tokens) => tokens.forEach((tk) => set.add(tk))
  categories.forEach((key) => {
    if (cat) {
      if (key === 'litter') add('litter', 'urination', 'straining')
      else if (key === 'urination') add('urination', 'straining', 'water')
      else if (key === 'hiding') add('hiding', 'appetite', 'energy')
      else if (key === 'appetite') add('appetite', 'water', 'energy')
      else if (key === 'water') add('water', 'appetite')
      else if (key === 'energy') add('energy', 'appetite')
      else if (key === 'vomiting') add('vomiting', 'appetite', 'water')
      else if (key === 'weight') add('weight', 'appetite')
    } else {
      if (key === 'skin') add('itching', 'earRedness', 'pawLicking')
      else if (key === 'stool') add('stool', 'appetite')
      else if (key === 'appetite') add('appetite', 'water', 'energy')
      else if (key === 'water') add('water', 'appetite')
      else if (key === 'energy') add('energy', 'appetite')
      else if (key === 'vomiting') add('vomiting', 'appetite', 'water')
      else if (key === 'ear_paws') add('earRedness', 'pawLicking', 'itching')
    }
  })
  return set
}

export function titleCase(value) {
  return String(value).toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

export function stoolLabel(checkIn) {
  if (!checkIn) return t('Not logged')
  const state = checkIn.stoolState
  if (state === 'NORMAL') return t('Normal')
  if (state === 'SOFT') return t('Soft')
  if (state === 'DIARRHEA') return t('Diarrhea')
  if (state === 'NO_STOOL') return t('No stool')
  if (checkIn.diarrhea) return t('Diarrhea')
  if (checkIn.stoolScore) return `${checkIn.stoolScore}/5`
  return t('Not logged')
}

export function levelLabel(value) {
  if (!value || value === 'UNKNOWN') return t('Not logged')
  return t(titleCase(value))
}

export function litterLabel(value) {
  if (!value || value === 'UNKNOWN') return t('Not logged')
  if (value === 'NONE') return t('Not used')
  return t(titleCase(value))
}

export function hidingLabel(value) {
  if (!value || value === 'UNKNOWN') return t('Not logged')
  return value === 'MORE' ? t('Hiding more') : t('As usual')
}

export function confidenceLabel(value) {
  const level = String(value ?? 'low').toLowerCase()
  if (level === 'high') return t('High confidence')
  if (level === 'medium') return t('Medium confidence')
  return t('Low confidence')
}
