// Protective tests for the date helpers, in particular the LOCAL (not UTC)
// date-only parsing that parseLocalDate/addDays exist for — see the comment
// in date.js on why new Date('YYYY-MM-DD') is the wrong tool here.

import { describe, expect, it } from 'vitest'
import { addDays, formatDate, parseLocalDate } from './date'

describe('parseLocalDate', () => {
  it('parses a bare YYYY-MM-DD as local midnight on that calendar day', () => {
    const d = parseLocalDate('2026-07-13')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(6) // 0-indexed: July
    expect(d.getDate()).toBe(13)
  })
})

describe('addDays', () => {
  it('shifts forward across a month boundary', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
  })

  it('shifts backward across a year boundary', () => {
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
  })

  it('returns the same date for a zero-day shift', () => {
    expect(addDays('2026-07-13', 0)).toBe('2026-07-13')
  })
})

describe('formatDate', () => {
  it('returns an empty string for a falsy value', () => {
    expect(formatDate('')).toBe('')
    expect(formatDate(null)).toBe('')
  })

  it('formats a bare date string into a non-empty label', () => {
    expect(formatDate('2026-07-13').length).toBeGreaterThan(0)
  })
})
