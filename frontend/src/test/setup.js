// Vitest setup: runs once before the test files in this project.
//
// jest-dom adds the extra matchers (toBeInTheDocument, etc.) used throughout
// the test suite. The rest of this file stubs the small set of browser APIs
// that jsdom doesn't implement but the app touches — kept minimal on purpose,
// as no-op/neutral stand-ins, so tests exercise the real app code rather than
// a mocked-out version of it.

import '@testing-library/jest-dom'

// jsdom has no layout engine, so window.matchMedia is not implemented. Nothing
// in the app currently calls it directly, but it's a common dependency-of-a-
// dependency need (and a cheap, safe stub), so it's provided defensively as a
// no-op MediaQueryList that always reports "no match".
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {}, // deprecated but still called by some libs
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false
  })
}

// `Notification` is intentionally left undefined — jsdom doesn't define it,
// and App.jsx already guards every use with `typeof Notification !== 'undefined'`.
// Stubbing it here would just hide a real-world gap, so we don't.
