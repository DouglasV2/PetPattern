// Protective tests for the Phase 2 pattern-memory progress strip: the null
// guard, the copy + meter for each stage, the terminal "no next line" cases
// (including a species-terminal stage that isn't the last one in general),
// singular/plural pattern-count wording, and the always-present calm caption.

import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PatternMemoryProgress } from './PatternMemoryProgress'

const pet = { id: 'pet-1', name: 'Bella', species: 'DOG' }
const cat = { id: 'pet-2', name: 'Miso', species: 'CAT' }

const CAPTION = 'Days that are the same as usual are just as useful — they are what "different" gets measured against.'

describe('<PatternMemoryProgress/>', () => {
  it('renders nothing when there is no progress', () => {
    const { container } = render(<PatternMemoryProgress pet={pet} progress={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('baseline_building: shows the countdown body, a 7-dot meter with 3 filled, and the next-stage line', () => {
    const progress = {
      usefulLogs: 3,
      foodLogsRecorded: 0,
      patternsActive: 0,
      weeklyOverviewReady: false,
      stage: 'baseline_building',
      nextStageAt: 7,
      logsToNextStage: 4
    }
    const { container } = render(<PatternMemoryProgress pet={pet} progress={progress} />)

    expect(screen.getByText(/4 more to go/)).toBeInTheDocument()
    const dots = container.querySelectorAll('.baseline-dot')
    expect(dots.length).toBe(7)
    expect(container.querySelectorAll('.baseline-dot.on').length).toBe(3)
    expect(screen.getByText('4 more check-ins and PetPattern has enough for a first weekly overview.')).toBeInTheDocument()
  })

  it('first_overview (dog, not yet terminal): shows the weekly-overview headline, the ready chip, and the next-stage line', () => {
    const progress = {
      usefulLogs: 7,
      foodLogsRecorded: 0,
      patternsActive: 0,
      weeklyOverviewReady: true,
      stage: 'first_overview',
      nextStageAt: 14,
      logsToNextStage: 7
    }
    render(<PatternMemoryProgress pet={pet} progress={progress} />)

    expect(screen.getByText('PetPattern now has enough entries for a first weekly overview')).toBeInTheDocument()
    expect(screen.getByText('First weekly overview ready')).toBeInTheDocument()
    expect(screen.getByText(/About two more weeks of logged days/)).toBeInTheDocument()
  })

  it('first_overview (cat, terminal for this species): no next-stage line, even though the stage is not the global last stage', () => {
    const progress = {
      usefulLogs: 7,
      foodLogsRecorded: 0,
      patternsActive: 0,
      weeklyOverviewReady: true,
      stage: 'first_overview',
      nextStageAt: 0,
      logsToNextStage: 0
    }
    render(<PatternMemoryProgress pet={cat} progress={progress} />)

    expect(screen.getByText('PetPattern now has enough entries for a first weekly overview')).toBeInTheDocument()
    expect(screen.queryByText(/About two more weeks of logged days/)).not.toBeInTheDocument()
    expect(screen.getByText(CAPTION)).toBeInTheDocument()
  })

  it('food_trigger_ready (terminal): no next-stage line, caption still present', () => {
    const progress = {
      usefulLogs: 22,
      foodLogsRecorded: 3,
      patternsActive: 0,
      weeklyOverviewReady: true,
      stage: 'food_trigger_ready',
      nextStageAt: 0,
      logsToNextStage: 0
    }
    const { container } = render(<PatternMemoryProgress pet={pet} progress={progress} />)

    expect(screen.getByText("Enough logs to line food up against Bella's signals")).toBeInTheDocument()
    // Terminal: a steady "N days logged" line, no dot meter.
    expect(container.querySelector('.baseline-dots')).not.toBeInTheDocument()
    expect(screen.getByText('22 days logged')).toBeInTheDocument()
    expect(screen.getByText(CAPTION)).toBeInTheDocument()
  })

  it('shows singular pattern wording for one active pattern, never "problem" or "diagnosis"', () => {
    const progress = {
      usefulLogs: 10,
      foodLogsRecorded: 0,
      patternsActive: 1,
      weeklyOverviewReady: true,
      stage: 'trend_baseline',
      nextStageAt: 21,
      logsToNextStage: 11
    }
    const { container } = render(<PatternMemoryProgress pet={pet} progress={progress} />)

    expect(screen.getByText('1 possible pattern noticed')).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/problem/i)
    expect(container.textContent).not.toMatch(/diagnosis/i)
  })

  it('shows plural pattern wording for more than one active pattern', () => {
    const progress = {
      usefulLogs: 10,
      foodLogsRecorded: 0,
      patternsActive: 2,
      weeklyOverviewReady: true,
      stage: 'trend_baseline',
      nextStageAt: 21,
      logsToNextStage: 11
    }
    render(<PatternMemoryProgress pet={pet} progress={progress} />)

    expect(screen.getByText('2 possible patterns noticed')).toBeInTheDocument()
  })

  it('renders the calm caption in every stage', () => {
    const stages = [
      { stage: 'baseline_start', nextStageAt: 1, logsToNextStage: 1, usefulLogs: 0 },
      { stage: 'baseline_building', nextStageAt: 7, logsToNextStage: 4, usefulLogs: 3 },
      { stage: 'first_overview', nextStageAt: 14, logsToNextStage: 7, usefulLogs: 7 },
      { stage: 'trend_baseline', nextStageAt: 21, logsToNextStage: 11, usefulLogs: 10 },
      { stage: 'food_trigger_ready', nextStageAt: 0, logsToNextStage: 0, usefulLogs: 22 }
    ]
    for (const s of stages) {
      const progress = { foodLogsRecorded: 0, patternsActive: 0, weeklyOverviewReady: false, ...s }
      const { unmount } = render(<PatternMemoryProgress pet={pet} progress={progress} />)
      expect(screen.getByText(CAPTION)).toBeInTheDocument()
      unmount()
    }
  })
})
