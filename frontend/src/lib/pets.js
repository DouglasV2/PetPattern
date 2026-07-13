import { t } from '../i18n'
import { speciesProfile } from '../speciesProfiles'

// A short, plural-safe age derived from a pet's birth date ("5 yr" / "3 mo"), or
// '' when the birthday is unknown. The abbreviations sidestep per-language plural
// forms (Croatian uses "god." / "mj."), so this needs no extra translations
// beyond the two count keys.
export function petAgeLabel(birthDate) {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return ''
  const [y, m, d] = birthDate.split('-').map(Number)
  const now = new Date()
  let months = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m)
  if (now.getDate() < d) months -= 1
  if (months < 0) return ''
  return months < 12 ? t('{count} mo', { count: months }) : t('{count} yr', { count: Math.floor(months / 12) })
}

// The quiet line under a pet's name on the sidebar "record cover": the breed the
// owner typed (kept verbatim — their words), or the species when there's no breed,
// plus the age when we know the birthday.
export function petSubtitle(pet) {
  if (!pet) return ''
  const breed = (pet.breed || '').trim()
  const parts = [breed || t(speciesProfile(pet.species).label)]
  const age = petAgeLabel(pet.birthDate)
  if (age) parts.push(age)
  return parts.join(' · ')
}
