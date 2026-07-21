// User-flow: the Today decision actions — the primary daily interaction. Verifies real behavior
// (which handler each choice fires) and the "already logged today" gating, not just that it renders.

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TodayDecisionActions } from './TodayDecisionActions'

const pet = { id: 'pet-1', name: 'Bella', species: 'DOG' }

function setup(props = {}) {
  const handlers = {
    onSameAsUsual: vi.fn(),
    onBackToUsual: vi.fn(),
    onSomethingChanged: vi.fn(),
    onAddNoteOrPhoto: vi.fn(),
    onFoodChange: vi.fn(),
    onVetSummary: vi.fn()
  }
  render(<TodayDecisionActions pet={pet} loggedToday={false} {...handlers} {...props} />)
  return handlers
}

describe('Today decision flow', () => {
  it('carries the last check-in forward in one tap', async () => {
    const h = setup()
    await userEvent.setup().click(screen.getByRole('button', { name: /No change since last check-in/i }))
    expect(h.onSameAsUsual).toHaveBeenCalledTimes(1)
  })

  it('records a distinct "back to usual" day in one tap', async () => {
    const h = setup()
    await userEvent.setup().click(screen.getByRole('button', { name: /Back to usual/i }))
    expect(h.onBackToUsual).toHaveBeenCalledTimes(1)
    expect(h.onSameAsUsual).not.toHaveBeenCalled()
  })

  it('opens the changed-day flow from "Something changed"', async () => {
    const h = setup()
    await userEvent.setup().click(screen.getByRole('button', { name: /Something changed/i }))
    expect(h.onSomethingChanged).toHaveBeenCalledTimes(1)
  })

  it('disables the no-change tap once today is already logged', () => {
    setup({ loggedToday: true })
    const button = screen.getByRole('button', { name: /No change since last check-in/i })
    expect(button).toBeDisabled()
    expect(screen.getByText('Today is logged')).toBeInTheDocument()
  })

  it('routes the secondary actions to food and vet', async () => {
    const h = setup()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Add food change/i }))
    await user.click(screen.getByRole('button', { name: /Bring this to your vet/i }))
    expect(h.onFoodChange).toHaveBeenCalledTimes(1)
    expect(h.onVetSummary).toHaveBeenCalledTimes(1)
  })
})
