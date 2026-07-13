// Smoke test: renders the real <App/> tree end-to-end. This is the single most
// important protective test ahead of splitting App.jsx (5800+ lines) into
// modules — the refactor is "move code between files", and a broken import or
// piece of wiring left behind will fail either `npm run build` (Vite) or this
// test, usually before a human notices.
//
// Only ./api and ./analytics are mocked (network + the privacy-analytics
// beacon — nothing jsdom can do anyway). Everything else — i18n, species
// profiles, legal copy, all the local component tree — is the real code.
//
// The api mock resolves the auth check to "nobody signed in", which is the
// same shape App.jsx sees from a fresh browser with no session cookie: App
// lands on the unauthenticated AuthScreen, which unconditionally renders the
// "PetPattern" brand mark — that's what this test asserts on.

import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('./api', () => ({
  api: {
    // Called directly by App's mount effect (checkAuth / api.config()).
    me: vi.fn(() => Promise.resolve(null)),
    config: vi.fn(() => Promise.resolve(null)),
    // Reached from checkAuth -> loadInitial() before authChecked flips true,
    // even on the signed-out path (see App.jsx's checkAuth/loadInitial).
    listPets: vi.fn(() => Promise.resolve([])),
    myInvites: vi.fn(() => Promise.resolve([]))
  },
  setUnauthorizedHandler: vi.fn()
}))

vi.mock('./analytics', () => ({
  track: vi.fn()
}))

import App from './App'

describe('<App/> smoke test', () => {
  it('renders the unauthenticated AuthScreen with the PetPattern brand mark', async () => {
    render(<App />)

    // "Just a moment…" while authChecked is false, then AuthScreen once the
    // mocked api.me()/api.config() calls settle.
    const brand = await screen.findByText('PetPattern')
    expect(brand).toBeInTheDocument()

    // Confirms we actually landed on AuthScreen (not stuck loading, not an
    // error state) — its headline copy, sign-in form and email field.
    expect(screen.getByText('PetPattern remembers what changed.')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
  })
})
