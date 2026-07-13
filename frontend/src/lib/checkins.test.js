// Protective tests for the check-in helpers: the species-seeding branches in
// emptyCheckInFor (dog/cat columns vs. the flexible starter-species
// observations map) and the toObservationsJson/parseObservations round-trip
// that persists a starter-species check-in's signals as JSON.

import { describe, expect, it } from 'vitest'
import { emptyCheckInFor, guidedTokens, keep, parseObservations, toObservationsJson } from './checkins'

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
