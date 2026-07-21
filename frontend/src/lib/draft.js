// Lightweight local draft protection for the longer check-in form (spec Part 3).
//
// A draft is ONLY the in-progress check-in field data for one pet, timestamped.
// It deliberately contains no authentication token (callers pass check-in fields
// only), is scoped by pet id, and is cleared on a successful save or an explicit
// discard. Because it lives in localStorage, it survives Android Back, navigation,
// a closed modal, app backgrounding and WebView recreation — the form is restored
// on the next mount. It is never auto-submitted, so it cannot create a duplicate.

const PREFIX = 'pp:checkin-draft:'

const key = (petId) => `${PREFIX}${petId}`

export function saveDraft(petId, form) {
  if (!petId || !form) return
  try {
    localStorage.setItem(key(petId), JSON.stringify({ form, savedAt: Date.now() }))
  } catch {
    // Storage full or unavailable — a draft is best-effort, never fatal.
  }
}

export function loadDraft(petId) {
  if (!petId) return null
  try {
    const raw = localStorage.getItem(key(petId))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && parsed.form ? parsed : null
  } catch {
    return null
  }
}

export function clearDraft(petId) {
  if (!petId) return
  try {
    localStorage.removeItem(key(petId))
  } catch {
    // ignore
  }
}

export function hasDraft(petId) {
  return loadDraft(petId) != null
}

// Whether a check-in form is worth protecting/restoring — a note, an observation,
// or any signal moved off its calm default. A pristine/untouched form is not, so
// we never nag about an empty form (spec Part 3).
export function isMeaningfulDraft(form) {
  if (!form) return false
  if (typeof form.freeTextNote === 'string' && form.freeTextNote.trim()) return true
  if (form.observations && Object.keys(form.observations).length > 0) return true
  if (form.itchingScore != null && form.itchingScore !== 2) return true
  const off = (v) => v && v !== 'NORMAL' && v !== 'UNKNOWN'
  if (off(form.stoolState) || off(form.appetiteLevel) || off(form.waterLevel)
      || off(form.energyLevel) || off(form.litterBoxUse) || off(form.urinationChange)
      || off(form.hidingBehavior)) {
    return true
  }
  return Boolean(form.vomiting || form.earRedness || form.pawLicking
      || form.straining || form.weightConcern)
}
