// Protective tests for Phase 3 (simplify Today): the decision actions always
// render, the log confirmation appears only once today is logged and reports
// the right weekly count, exactly one of the three insight cards renders (in
// priority order), and the bulky secondary content moves into a collapsed
// <details> without losing anything. Real component tree, real i18n — only
// the handler props are mocked (vi.fn()), same spirit as App.smoke.test.jsx.

import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TodayView } from './TodayView'
import { addDays, today } from '../../lib/date'

function makeCheckIn(daysAgo, overrides = {}) {
  return { id: `checkin-${daysAgo}`, checkInDate: addDays(today, -daysAgo), ...overrides }
}

function baseProps(overrides = {}) {
  return {
    pet: { id: 'pet-1', name: 'Bella', species: 'DOG' },
    overview: {},
    latestCheckIn: null,
    currentFood: null,
    topPattern: null,
    checkIns: [],
    onLogToday: vi.fn(),
    onFoodChange: vi.fn(),
    onFoodDetective: vi.fn(),
    onPatterns: vi.fn(),
    onShowTimeline: vi.fn(),
    onVetSummary: vi.fn(),
    onEditCheckIn: vi.fn(),
    onDeleteCheckIn: vi.fn(),
    onQuickLog: vi.fn(),
    onCaregivers: vi.fn(),
    onLogDay: vi.fn(),
    onSomethingChanged: vi.fn(),
    onAddNoteOrPhoto: vi.fn(),
    activities: [],
    onAddActivity: vi.fn(),
    onRemoveActivity: vi.fn(),
    ...overrides
  }
}

describe('<TodayView/>', () => {
  it('renders the three primary decision actions', () => {
    render(<TodayView {...baseProps()} />)
    expect(screen.getByRole('button', { name: /No change since last check-in/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Something changed/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Add note or photo/ })).toBeInTheDocument()
  })

  describe('log confirmation', () => {
    it('shows the weekly check-in count once today is logged', () => {
      // 4 check-ins inside the last 7 days (today, -1, -2, -3).
      const checkIns = [0, 1, 2, 3].map((n) => makeCheckIn(n))
      const props = baseProps({
        checkIns,
        overview: { retention: { loggedToday: true, daysSinceLastCheckIn: 0, loggedDaysLast30: 4 } }
      })
      render(<TodayView {...props} />)
      expect(screen.getByText("Saved — that's Bella's 4 check-ins this week.")).toBeInTheDocument()
    })

    it('shows no confirmation line when today is not logged', () => {
      const props = baseProps({
        checkIns: [],
        overview: { retention: { loggedToday: false, daysSinceLastCheckIn: null, loggedDaysLast30: 0 } }
      })
      render(<TodayView {...props} />)
      expect(screen.queryByText(/^Saved —/)).not.toBeInTheDocument()
    })
  })

  describe('one primary insight', () => {
    it('renders only the weekly insight when overview.weeklyInsight exists, even though a seen-before pattern also qualifies', () => {
      const topPattern = {
        id: 'p1',
        title: 'Scratching pattern',
        summary: 'Scratching has come up a few times.',
        seenBefore: true,
        status: 'ACKNOWLEDGED',
        firstDetectedAt: '2026-07-01'
      }
      const props = baseProps({
        checkIns: [makeCheckIn(0)],
        topPattern,
        overview: {
          weeklyInsight: { tone: 'good', label: 'This week', headline: 'A calm week for Bella', body: 'Nothing stood out.' }
        }
      })
      const { container } = render(<TodayView {...props} />)

      expect(screen.getByText('A calm week for Bella')).toBeInTheDocument()
      expect(container.querySelector('.weekly-insight')).toBeInTheDocument()
      expect(container.querySelector('.seen-before-card')).not.toBeInTheDocument()
      expect(container.querySelector('.today-note')).not.toBeInTheDocument()
    })

    it('falls through to the seen-before card when there is no weekly insight but a pattern qualifies', () => {
      const topPattern = {
        id: 'p1',
        title: 'Scratching pattern',
        summary: 'Scratching has come up a few times.',
        seenBefore: true,
        status: 'ACKNOWLEDGED',
        firstDetectedAt: '2026-07-01'
      }
      const props = baseProps({ checkIns: [makeCheckIn(0)], topPattern, overview: {} })
      const { container } = render(<TodayView {...props} />)

      expect(container.querySelector('.seen-before-card')).toBeInTheDocument()
      expect(container.querySelector('.weekly-insight')).not.toBeInTheDocument()
      expect(container.querySelector('.today-note')).not.toBeInTheDocument()
    })

    it('falls through to the calm note "start with one easy note" empty state for a brand-new pet', () => {
      const props = baseProps({ checkIns: [], topPattern: null, overview: {} })
      const { container } = render(<TodayView {...props} />)

      expect(container.querySelector('.today-note')).toBeInTheDocument()
      expect(screen.getByText('Start with one easy note')).toBeInTheDocument()
      expect(container.querySelector('.weekly-insight')).not.toBeInTheDocument()
      expect(container.querySelector('.seen-before-card')).not.toBeInTheDocument()
    })
  })

  describe('pattern-memory progress de-dup (Phase 2)', () => {
    it('renders PatternMemoryProgress exactly once, in the always-visible payoff area (not inside details.today-more)', () => {
      const progress = {
        usefulLogs: 3,
        foodLogsRecorded: 0,
        patternsActive: 0,
        weeklyOverviewReady: false,
        stage: 'baseline_building',
        nextStageAt: 7,
        logsToNextStage: 4
      }
      const props = baseProps({
        checkIns: [makeCheckIn(0)],
        overview: { retention: { loggedToday: true, daysSinceLastCheckIn: 0, loggedDaysLast30: 1 }, patternMemory: progress }
      })
      const { container } = render(<TodayView {...props} />)

      const strips = container.querySelectorAll('.pattern-memory-progress')
      expect(strips.length).toBe(1)
      const details = container.querySelector('details.today-more')
      expect(details.querySelector('.pattern-memory-progress')).not.toBeInTheDocument()
    })

    it('no longer renders the removed RetentionStrip baseline-hook/retention-stats block', () => {
      const props = baseProps({
        checkIns: [makeCheckIn(0), makeCheckIn(1)],
        overview: { retention: { loggedToday: true, daysSinceLastCheckIn: 0, loggedDaysLast30: 2 } }
      })
      const { container } = render(<TodayView {...props} />)

      expect(container.querySelector('.baseline-hook')).not.toBeInTheDocument()
      expect(container.querySelector('.retention-stats')).not.toBeInTheDocument()
    })

    it('still shows exactly one weekly check-ins confirmation node', () => {
      const checkIns = [0, 1, 2, 3].map((n) => makeCheckIn(n))
      const props = baseProps({
        checkIns,
        overview: { retention: { loggedToday: true, daysSinceLastCheckIn: 0, loggedDaysLast30: 4 } }
      })
      render(<TodayView {...props} />)

      expect(screen.getAllByText(/check-ins this week|first check-in this week/).length).toBe(1)
    })
  })

  describe('collapsible secondary section', () => {
    it('renders a collapsed <details class="today-more"> that still contains the recent timeline', () => {
      const props = baseProps({ checkIns: [makeCheckIn(0), makeCheckIn(1)] })
      const { container } = render(<TodayView {...props} />)

      const details = container.querySelector('details.today-more')
      expect(details).toBeInTheDocument()
      expect(details.hasAttribute('open')).toBe(false)
      expect(details.querySelector('.timeline-panel')).toBeInTheDocument()
      expect(screen.getByText('Recent memory')).toBeInTheDocument()
    })

    it('still renders the home-grid, activity quick-add and caregiver line inside the collapsible', () => {
      const props = baseProps({
        checkIns: [makeCheckIn(0)],
        latestCheckIn: makeCheckIn(0, { itchingScore: 3, stoolState: 'NORMAL' }),
        currentFood: { brand: 'Acme', productName: 'Chicken kibble', foodKind: 'MAIN', dateStarted: today, primaryProtein: 'CHICKEN' }
      })
      const { container } = render(<TodayView {...props} />)
      const details = container.querySelector('details.today-more')

      expect(details.querySelector('.home-grid')).toBeInTheDocument()
      expect(details.querySelector('.activity-quickadd')).toBeInTheDocument()
      expect(details.querySelector('.care-circle-line')).toBeInTheDocument()
      expect(screen.getByText('Current food')).toBeInTheDocument()
    })
  })
})
