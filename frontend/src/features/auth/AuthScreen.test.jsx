// User-flow: sign-in and registration. Verifies the login form submits the entered credentials and
// that registration is gated on accepting the terms/medical-disclaimer (a real product requirement).

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthScreen } from './AuthScreen'

vi.mock('../../api', () => ({ api: { forgotPassword: vi.fn(() => Promise.resolve()) } }))

function setup(props = {}) {
  const handlers = { onLogin: vi.fn(() => Promise.resolve()), onRegister: vi.fn(() => Promise.resolve()) }
  render(<AuthScreen onLogin={handlers.onLogin} onRegister={handlers.onRegister} demoEnabled={false} {...props} />)
  return handlers
}

describe('Auth flow', () => {
  it('submits the entered credentials to onLogin', async () => {
    const h = setup()
    const user = userEvent.setup()
    await user.type(screen.getByPlaceholderText('Email'), 'owner@example.com')
    await user.type(screen.getByPlaceholderText(/Password/), 'secret12345')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(h.onLogin).toHaveBeenCalledWith('owner@example.com', 'secret12345')
  })

  it('gates registration until the terms + medical disclaimer are accepted', async () => {
    const h = setup()
    const user = userEvent.setup()
    // Switch to the register form.
    await user.click(screen.getByRole('button', { name: /Create an account/i }))
    await user.type(screen.getByPlaceholderText('Email'), 'new@example.com')
    await user.type(screen.getByPlaceholderText(/Password/), 'secret12345')

    // The submit is disabled until the acceptance checkbox is ticked.
    const submit = screen.getByRole('button', { name: 'Create account' })
    expect(submit).toBeDisabled()
    expect(h.onRegister).not.toHaveBeenCalled()

    await user.click(screen.getByRole('checkbox'))
    expect(submit).toBeEnabled()
    await user.click(submit)
    expect(h.onRegister).toHaveBeenCalledWith('new@example.com', 'secret12345', '', true)
  })

  it('offers password recovery without revealing whether an account exists', async () => {
    setup()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Forgot your password/i }))
    await user.type(screen.getByPlaceholderText('Email'), 'owner@example.com')
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))
    expect(await screen.findByText(/If an account exists/i)).toBeInTheDocument()
  })
})
