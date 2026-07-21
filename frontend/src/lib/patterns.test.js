import { describe, it, expect } from 'vitest'
import { memoryLine, stageMeta } from './patterns'

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

// Part 8: the four stages map to plain, non-causal labels with a stable number.
describe('stageMeta', () => {
  it('gives each stage a number 1..4', () => {
    expect(stageMeta('STAGE_1_DATED').number).toBe(1)
    expect(stageMeta('STAGE_2_REPEATED').number).toBe(2)
    expect(stageMeta('STAGE_3_POSSIBLE_ASSOCIATION').number).toBe(3)
    expect(stageMeta('STAGE_4_WORTH_VET').number).toBe(4)
  })

  it('never uses causal or confidence wording in a label', () => {
    for (const s of ['STAGE_1_DATED', 'STAGE_2_REPEATED', 'STAGE_3_POSSIBLE_ASSOCIATION', 'STAGE_4_WORTH_VET']) {
      expect(stageMeta(s).label.toLowerCase()).not.toMatch(/confidence|trigger|allergy|cause|likely|probable/)
    }
  })

  it('falls back to stage 1 for an unknown value', () => {
    expect(stageMeta(undefined).number).toBe(1)
  })
})
