// Protective tests for the kg<->lb weight conversion used by the onboarding
// unit toggle (PetOnboarding in App.jsx). The two directions use different
// literal constants (see units.js), so this pins both independently rather
// than assuming one is the exact inverse of the other.

import { describe, expect, it } from 'vitest'
import { kgToLb, lbToKg } from './units'

describe('kgToLb', () => {
  it('converts a known kg value to pounds', () => {
    expect(kgToLb(10)).toBeCloseTo(22.046226, 5)
  })

  it('treats 0 as 0', () => {
    expect(kgToLb(0)).toBe(0)
  })
})

describe('lbToKg', () => {
  it('converts a known lb value to kilograms', () => {
    expect(lbToKg(22.046226)).toBeCloseTo(10, 5)
  })

  it('treats 0 as 0', () => {
    expect(lbToKg(0)).toBe(0)
  })
})

describe('kgToLb / lbToKg round-trip', () => {
  it('recovers the original weight within a hundredth of a kg', () => {
    const originalKg = 4.5
    expect(lbToKg(kgToLb(originalKg))).toBeCloseTo(originalKg, 5)
  })
})
