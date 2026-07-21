import { describe, it, expect, beforeEach } from 'vitest'
import { saveDraft, loadDraft, clearDraft, hasDraft, isMeaningfulDraft } from './draft'

describe('isMeaningfulDraft', () => {
  it('ignores a pristine / untouched form (no nag on an empty form)', () => {
    expect(isMeaningfulDraft({ itchingScore: 2, stoolState: 'NORMAL', freeTextNote: '', observations: {} })).toBe(false)
    expect(isMeaningfulDraft(null)).toBe(false)
  })

  it('protects a form with a note, an observation, or a signal off baseline', () => {
    expect(isMeaningfulDraft({ freeTextNote: 'itchy today' })).toBe(true)
    expect(isMeaningfulDraft({ itchingScore: 8 })).toBe(true)
    expect(isMeaningfulDraft({ stoolState: 'DIARRHEA' })).toBe(true)
    expect(isMeaningfulDraft({ vomiting: true })).toBe(true)
    expect(isMeaningfulDraft({ observations: { appetite_hay: { value: 'less' } } })).toBe(true)
  })
})

// Part 3: lightweight local draft protection for the longer check-in form —
// scoped to the active pet, timestamped, no auth tokens, cleared on save/discard.
describe('check-in draft', () => {
  beforeEach(() => localStorage.clear())

  it('round-trips a draft so it survives navigation / interruption', () => {
    saveDraft('pet-1', { itchingScore: 6, freeTextNote: 'off today' })
    const draft = loadDraft('pet-1')
    expect(draft.form.itchingScore).toBe(6)
    expect(draft.form.freeTextNote).toBe('off today')
    expect(typeof draft.savedAt).toBe('number')
    expect(hasDraft('pet-1')).toBe(true)
  })

  it('is scoped to the active pet', () => {
    saveDraft('pet-1', { itchingScore: 6 })
    expect(loadDraft('pet-2')).toBeNull()
    expect(hasDraft('pet-2')).toBe(false)
  })

  it('clears after an explicit discard (and after a successful save)', () => {
    saveDraft('pet-1', { itchingScore: 6 })
    clearDraft('pet-1')
    expect(loadDraft('pet-1')).toBeNull()
    expect(hasDraft('pet-1')).toBe(false)
  })

  it('tolerates malformed storage without throwing', () => {
    localStorage.setItem('pp:checkin-draft:pet-1', 'not json{')
    expect(loadDraft('pet-1')).toBeNull()
  })

  it('does nothing without a pet id or form', () => {
    saveDraft(null, { itchingScore: 6 })
    saveDraft('pet-1', null)
    expect(hasDraft('pet-1')).toBe(false)
  })
})
