import { t } from '../i18n'
import { levelLabel, stoolLabel, litterLabel, hidingLabel } from './checkins'
import { parseLocalDate, today, formatDate } from './date'

// For a given pattern, the ONE signal we show over time and how to read a single
// check-in into a calm/watch/changed tone plus a short value for the tooltip.
// Species is implicit in the pattern type, so we never mix dog/cat signals.
export function evidenceSignal(pattern) {
  const lvl = (v, calm, watch, changed) =>
    v == null || v === 'UNKNOWN' ? null : { tone: changed.includes(v) ? 'changed' : watch.includes(v) ? 'watch' : 'calm', value: levelLabel(v) }
  switch (pattern.type) {
    case 'ITCHING_ABOVE_BASELINE':
    case 'POSSIBLE_FOOD_TRIGGER':
      return { label: t('Scratching'), read: (c) => c.itchingScore == null ? null
        : { tone: c.itchingScore >= 7 ? 'changed' : c.itchingScore >= 4 ? 'watch' : 'calm', value: `${c.itchingScore}/10` } }
    case 'STOOL_INSTABILITY':
      return { label: t('Stool'), read: (c) => !c.stoolState || c.stoolState === 'UNKNOWN' ? null
        : { tone: c.stoolState === 'DIARRHEA' ? 'changed' : (c.stoolState === 'SOFT' || c.stoolState === 'NO_STOOL') ? 'watch' : 'calm', value: stoolLabel(c.stoolState) } }
    case 'WATER_DROP':
    case 'WATER_CHANGE':
      return { label: t('Water'), read: (c) => lvl(c.waterLevel, [], ['LOWER', 'HIGHER'], []) }
    case 'RECURRING_EAR_REDNESS':
      return { label: t('Ears'), read: (c) => ({ tone: c.earRedness ? 'changed' : 'calm', value: c.earRedness ? t('Redness') : t('Clear') }) }
    case 'APPETITE_LOW':
      return { label: t('Appetite'), read: (c) => lvl(c.appetiteLevel, [], ['LOWER', 'HIGHER'], ['REFUSED']) }
    case 'LITTER_BOX_CHANGE':
      return { label: t('Litter box'), read: (c) => {
        const off = (v) => v && v !== 'NORMAL' && v !== 'UNKNOWN'
        const blank = (v) => v == null || v === 'UNKNOWN'
        if (c.litterBoxUse === 'NONE') return { tone: 'changed', value: litterLabel(c.litterBoxUse) }
        if (c.straining) return { tone: 'watch', value: t('Straining') }
        if (off(c.litterBoxUse) || off(c.urinationChange)) return { tone: 'watch', value: litterLabel(c.litterBoxUse) }
        if (blank(c.litterBoxUse) && blank(c.urinationChange)) return null
        return { tone: 'calm', value: litterLabel(c.litterBoxUse) }
      } }
    case 'HIDING_INCREASED':
      return { label: t('Hiding'), read: (c) => c.hidingBehavior === 'UNKNOWN' || c.hidingBehavior == null ? null
        : { tone: c.hidingBehavior === 'MORE' ? 'watch' : 'calm', value: hidingLabel(c.hidingBehavior) } }
    case 'REPEATED_VOMITING':
      return { label: t('Vomiting'), read: (c) => ({ tone: c.vomiting ? 'changed' : 'calm', value: c.vomiting ? t('Vomiting') : t('None') }) }
    default:
      return null
  }
}

// The last `window` calendar days, oldest first, as { iso, date }.
export function lastDays(window) {
  const base = parseLocalDate(today)
  const out = []
  for (let i = window - 1; i >= 0; i--) {
    const d = new Date(base)
    d.setDate(base.getDate() - i)
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    out.push({ iso, date: d })
  }
  return out
}

// The word for a signal's notable ("changed") state, for the cell-strip legend.
export function changedLabel(type) {
  switch (type) {
    case 'RECURRING_EAR_REDNESS': return t('Redness')
    case 'STOOL_INSTABILITY': return t('Diarrhea')
    case 'REPEATED_VOMITING': return t('Vomiting')
    case 'APPETITE_LOW': return t('Refused')
    case 'HIDING_INCREASED': return t('Hiding more')
    default: return t('Change')
  }
}

export function statusLabel(status, petName) {
  if (status === 'normal') return t('Normal for {name}', { name: petName })
  if (status === 'watch') return t('Worth watching')
  return t('Changed')
}

// NOTE: not currently referenced anywhere in App.jsx — moved as-is, unused, to
// avoid a behavior change.
export function todayHeadline(pet, overview, topPattern, latestCheckIn) {
  if (!latestCheckIn) return t('{name} needs a first baseline day.', { name: pet.name })
  if (topPattern) return topPattern.title
  if (overview?.todayStatus === 'watch') return t('{name} is worth watching today.', { name: pet.name })
  if (overview?.todayStatus === 'changed') return t("{name} needs today's check-in.", { name: pet.name })
  return t('{name} looks close to normal.', { name: pet.name })
}

export function isDismissedStatus(status) {
  return status === 'RESOLVED' || status === 'NOT_RELEVANT'
}

export function patternGroup(pattern) {
  if (isDismissedStatus(pattern.status)) return 'dismissed'
  if (pattern.currentlyDetected === false) return 'settled'
  return 'active'
}

export function settledLine(pattern) {
  const days = pattern.daysSinceLastSeen
  if (days == null) return t('Settled')
  if (days <= 0) return t('Settled — last seen today')
  return t(days === 1 ? 'Not seen in {n} day' : 'Not seen in {n} days', { n: days })
}

export function statusMeta(status) {
  switch (status) {
    case 'ACKNOWLEDGED':
      return { label: t('Watching'), tone: 'watch' }
    case 'SHARED_WITH_VET':
      return { label: t('In vet summary'), tone: 'vet' }
    case 'RESOLVED':
      return { label: t('Resolved'), tone: 'calm' }
    case 'NOT_RELEVANT':
      return { label: t('Set aside'), tone: 'muted' }
    default:
      return { label: '', tone: '' }
  }
}

export function memoryLine(pattern) {
  if (!pattern?.firstDetectedAt) return ''
  // seenBefore is backed by episodeCount (genuinely separate periods) — never the
  // engine-run-day count, which must not read as recurrence (spec Part 9).
  if (pattern.seenBefore) {
    return t('Noticed in more than one separate stretch since {date}', { date: formatDate(pattern.firstDetectedAt) })
  }
  return t('First noticed {date}', { date: formatDate(pattern.firstDetectedAt) })
}

// The four evidence stages (spec Part 8) as plain, non-causal UI labels. These
// describe how much the record supports talking about something — never a
// confidence level or a cause. `number` (1..4) is for ordering/display only.
export function stageMeta(stage) {
  switch (stage) {
    case 'STAGE_4_WORTH_VET':
      return { number: 4, label: t('Worth mentioning to your vet') }
    case 'STAGE_3_POSSIBLE_ASSOCIATION':
      return { number: 3, label: t('Possible link — keep tracking') }
    case 'STAGE_2_REPEATED':
      return { number: 2, label: t('Noticed more than once') }
    case 'STAGE_1_DATED':
    default:
      return { number: 1, label: t('Noticed once') }
  }
}

export function trendWord(label) {
  switch (label) {
    case 'calmer': return t('calmer')
    case 'itchier': return t('itchier')
    default: return t('about the same')
  }
}
