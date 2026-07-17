// The immediate safety layer on Today (WP1, frontend surface): the null/empty guard, the
// non-diagnostic copy + vet-handoff rendering, the polite live region for screen readers, and
// one coral banner per observation.

import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ImmediateObservationCard } from './ImmediateObservationCard'

const urgent = {
  id: 'now:pet-1:CAT_URINARY_OBSTRUCTION_RISK',
  type: 'STARTER_URGENT_SIGN',
  severity: 'urgent',
  title: 'Straining with little or no urine',
  summary:
    'You logged Milo straining with little or no urine passing on the same day. ' +
    'This is not a diagnosis and PetPattern cannot tell you the cause.',
  urgentNote: 'PetPattern cannot examine Milo — if this is happening now, please call your vet right away.',
  relatedCheckInIds: []
}

describe('<ImmediateObservationCard/>', () => {
  it('renders nothing when there are no observations', () => {
    const { container } = render(<ImmediateObservationCard observations={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when observations is undefined', () => {
    const { container } = render(<ImmediateObservationCard observations={undefined} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('surfaces the urgent title, non-diagnostic summary and vet-handoff in a polite live region', () => {
    render(<ImmediateObservationCard observations={[urgent]} />)
    const region = screen.getByRole('status')
    expect(region).toHaveAttribute('aria-live', 'polite')
    expect(screen.getByText(urgent.title)).toBeInTheDocument()
    expect(screen.getByText(/not a diagnosis/)).toBeInTheDocument()
    expect(screen.getByText(/please call your vet/)).toBeInTheDocument()
  })

  it('renders one coral banner per observation', () => {
    const second = {
      ...urgent,
      id: 'now:pet-1:DOG_ACUTE_DISTRESS',
      title: 'Several serious signs on the same day'
    }
    const { container } = render(<ImmediateObservationCard observations={[urgent, second]} />)
    expect(container.querySelectorAll('.urgent-banner').length).toBe(2)
  })
})
