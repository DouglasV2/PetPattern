// Protective tests for the check-in helpers: the species-seeding branches in
// emptyCheckInFor (dog/cat columns vs. the flexible starter-species
// observations map) and the toObservationsJson/parseObservations round-trip
// that persists a starter-species check-in's signals as JSON.

import { describe, expect, it } from 'vitest'
import { emptyCheckInFor, guidedTokens, keep, parseObservations, quickCheckInPayload, toObservationsJson } from './checkins'

// Part 2: "No change since last check-in" (carry) and "Back to usual" (baseline)
// are DIFFERENT states, and neither may be mislabeled as the other.
describe('quickCheckInPayload', () => {
  it('carry keeps a still-unwell dog unwell (nothing changed does not mean recovered)', () => {
    const base = { itchingScore: 8, stoolState: 'SOFT', appetiteLevel: 'LOWER' }
    const p = quickCheckInPayload('DOG', base, '2026-07-10', 'carry')
    expect(p.itchingScore).toBe(8)
    expect(p.stoolState).toBe('SOFT')
    expect(p.appetiteLevel).toBe('LOWER')
    expect(p.checkInDate).toBe('2026-07-10')
  })

  it('back-to-usual writes normal baseline values even right after an unwell day', () => {
    const base = { itchingScore: 8, stoolState: 'DIARRHEA', appetiteLevel: 'LOWER' }
    const p = quickCheckInPayload('DOG', base, '2026-07-10', 'usual')
    expect(p.itchingScore).toBeLessThanOrEqual(2)
    expect(p.stoolState).toBe('NORMAL')
    expect(p.appetiteLevel).toBe('NORMAL')
  })

  it('the two actions are distinguishable states after an unwell day', () => {
    const base = { itchingScore: 8 }
    const carry = quickCheckInPayload('DOG', base, '2026-07-10', 'carry')
    const usual = quickCheckInPayload('DOG', base, '2026-07-10', 'usual')
    expect(carry.itchingScore).not.toBe(usual.itchingScore)
  })

  it('carries a starter species observation forward on "no change", clears it on "back to usual"', () => {
    const base = { observationsJson: JSON.stringify({ species: 'RABBIT', signals: [{ key: 'appetite_hay', label: 'Appetite', value: 'less' }] }) }
    expect(quickCheckInPayload('RABBIT', base, '2026-07-10', 'carry').observationsJson).toContain('appetite_hay')
    expect(quickCheckInPayload('RABBIT', base, '2026-07-10', 'usual').observationsJson).toBeNull()
  })
})

describe('emptyCheckInFor', () => {
  it('seeds dog-specific fields for a dog and omits cat-only fields', () => {
    const form = emptyCheckInFor('DOG')
    expect(form).toMatchObject({ itchingScore: 2, stoolState: 'NORMAL', earRedness: false, pawLicking: false })
    expect(form).not.toHaveProperty('litterBoxUse')
  })

  it('seeds cat-specific fields for a cat and omits dog-only fields', () => {
    const form = emptyCheckInFor('CAT')
    expect(form).toMatchObject({ litterBoxUse: 'NORMAL', urinationChange: 'NORMAL', hidingBehavior: 'NORMAL' })
    expect(form).not.toHaveProperty('itchingScore')
  })

  it('seeds only the flexible observations map for a starter species', () => {
    const form = emptyCheckInFor('RABBIT')
    expect(form).toEqual({ checkInDate: expect.any(String), freeTextNote: '', observations: {} })
  })
})

describe('toObservationsJson / parseObservations round-trip', () => {
  it('serializes recorded signals and parses back an equivalent observations map', () => {
    const form = {
      observations: {
        poop: { label: 'Poop', value: 'Softer', severity: 'mild', note: 'once today' },
        water: { label: 'Water', value: '' } // no value and no note -> dropped
      }
    }

    const json = toObservationsJson(form, 'RABBIT')
    expect(json).not.toBeNull()

    const parsed = parseObservations(json)
    expect(parsed).toEqual({
      poop: { label: 'Poop', value: 'Softer', severity: 'mild', status: null, area: null, note: 'once today' }
    })
    expect(parsed).not.toHaveProperty('water')
  })

  it('returns null when nothing was recorded', () => {
    expect(toObservationsJson({ observations: {} }, 'RABBIT')).toBeNull()
  })

  it('parseObservations tolerates a missing or invalid payload', () => {
    expect(parseObservations(null)).toEqual({})
    expect(parseObservations('not valid json')).toEqual({})
  })
})

describe('keep', () => {
  it('carries a known level forward unchanged', () => {
    expect(keep('LOWER')).toBe('LOWER')
  })

  it('falls back to NORMAL for UNKNOWN or empty', () => {
    expect(keep('UNKNOWN')).toBe('NORMAL')
    expect(keep(undefined)).toBe('NORMAL')
  })
})

describe('guidedTokens', () => {
  it('unions the fields revealed by multiple dog categories, de-duplicated', () => {
    const tokens = guidedTokens(['stool', 'appetite'], false)
    expect([...tokens].sort()).toEqual(['appetite', 'energy', 'stool', 'water'])
  })

  it('unions the fields revealed by a cat category', () => {
    const tokens = guidedTokens(['litter'], true)
    expect([...tokens].sort()).toEqual(['litter', 'straining', 'urination'])
  })
})
