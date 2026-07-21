import { describe, it, expect } from 'vitest'
import { memoryLine } from './patterns'

// Part 9 / Part 32: the "seen before" memory line must come from genuinely
// separate periods (pattern.seenBefore, backed by episodeCount), never from the
// engine-run-day count. The frontend no longer receives a detectionCount at all.
describe('memoryLine', () => {
  it('is empty without a first-noticed date', () => {
    expect(memoryLine({ seenBefore: true })).toBe('')
  })

  it('states only the first-noticed date for a single-period pattern', () => {
    const line = memoryLine({ seenBefore: false, firstDetectedAt: '2026-07-01' })
    expect(line).toMatch(/first noticed/i)
    expect(line).not.toMatch(/few times|again|separate/i)
  })

  it('mentions separate periods only when the pattern was truly seen before', () => {
    const line = memoryLine({ seenBefore: true, firstDetectedAt: '2026-07-01' })
    expect(line).toMatch(/separate/i)
  })

  it('does not depend on any detectionCount field', () => {
    // A high engine-run count with a single period must NOT read as recurrence.
    const line = memoryLine({ seenBefore: false, detectionCount: 9, firstDetectedAt: '2026-07-01' })
    expect(line).toMatch(/first noticed/i)
    expect(line).not.toMatch(/separate|few times/i)
  })
})
