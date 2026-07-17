import { defineConfig, devices } from '@playwright/test'

// Minimal, stable release-gate E2E suite. It runs against an ALREADY-RUNNING full stack (the
// simplest reliable setup) — bring it up first with `docker compose up` from the repo root, then:
//   cd frontend && npm run test:e2e
// Nothing here depends on Google OAuth or production secrets; the flows use email/password and the
// local demo seed only. Override the target with PLAYWRIGHT_BASE_URL for a different host/port.
//
// 127.0.0.1 (not localhost): on some Windows/IPv6 setups localhost resolves to ::1 first and the
// dev stack is only published on IPv4.
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:7317'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ]
})
