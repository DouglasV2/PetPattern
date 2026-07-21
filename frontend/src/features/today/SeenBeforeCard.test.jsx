import { describe, it, expect } from 'vitest'
import { seenBeforeQualifies } from './SeenBeforeCard'

// Part 9: the "This looks familiar" nudge may only appear for a pattern seen in
// genuinely separate periods (seenBefore). A high engine-run detectionCount must
// never, on its own, promote a first-time pattern to "seen before".
describe('seenBeforeQualifies', () => {
  it('is false without a pattern', () => {
    expect(seenBeforeQualifies(null)).toBe(false)
  })

  it('qualifies a pattern that was seen across separate periods', () => {
    expect(seenBeforeQualifies({ seenBefore: true, status: 'NEW' })).toBe(true)
  })

  it('does not qualify a single-period pattern', () => {
    expect(seenBeforeQualifies({ seenBefore: false, status: 'NEW' })).toBe(false)
  })

  it('is not promoted by a high engine-run detectionCount alone', () => {
    expect(seenBeforeQualifies({ seenBefore: false, detectionCount: 9, status: 'NEW' })).toBe(false)
  })

  it('stays hidden once the owner has set the pattern aside', () => {
    expect(seenBeforeQualifies({ seenBefore: true, status: 'RESOLVED' })).toBe(false)
    expect(seenBeforeQualifies({ seenBefore: true, status: 'NOT_RELEVANT' })).toBe(false)
  })
})
