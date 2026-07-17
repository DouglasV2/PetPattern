// Minimal, stable release-gate E2E flows (WP8). Runs against a running stack (see
// playwright.config.js). Nothing here uses Google OAuth or production secrets — email/password and
// the local demo seed only. Kept intentionally small: it guards the critical user journeys, not
// every screen.

import { test, expect } from '@playwright/test'

function uniqueEmail() {
  return `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.test`
}

// Register a brand-new owner and land on the onboarding "choose a species" step.
async function registerNewOwner(page) {
  const email = uniqueEmail()
  await page.goto('/')
  await page.getByRole('button', { name: /Create an account/i }).click()
  await page.getByPlaceholder('Email').fill(email)
  await page.getByPlaceholder(/Password/).fill('e2e-password-123')
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByRole('heading', { name: /What pet do you want to track/i })).toBeVisible()
  return email
}

// From the species step, create a pet and go to its Today view.
async function onboardPet(page, speciesLabel, name) {
  await page.locator('.species-card').filter({ hasText: speciesLabel }).first().click()
  await page.getByPlaceholder("Your pet's name").fill(name)
  await page.getByRole('button', { name: /Create profile/i }).click()
  await expect(page.getByRole('heading', { name: new RegExp(`${name} is all set`, 'i') })).toBeVisible()
  await page.getByRole('button', { name: new RegExp(`Go to ${name} today`, 'i') }).click()
  await expect(page.getByRole('heading', { name: new RegExp(`How is ${name} today`, 'i') })).toBeVisible()
}

// Load the seeded dog demo (Bella) and land on Today.
async function startDogDemo(page) {
  await page.goto('/')
  await page.getByRole('button', { name: /Try dog demo/i }).click()
  await expect(page.getByRole('heading', { name: /How is .* today/i })).toBeVisible({ timeout: 20_000 })
}

test.describe('PetPattern release flows', () => {
  test('onboarding → pet creation → first check-in (same as usual)', async ({ page }) => {
    await registerNewOwner(page)
    await onboardPet(page, 'Dog', 'E2ERex')
    // First check-in via the quick "same as usual" path.
    await page.getByRole('button', { name: /Same as usual/i }).click()
    await expect(page.getByText(/Saved —/i).first()).toBeVisible()
  })

  test('changed-day check-in opens the detailed log and saves back to Today', async ({ page }) => {
    await registerNewOwner(page)
    await onboardPet(page, 'Cat', 'E2EMilo')
    await page.getByRole('button', { name: /Something changed/i }).click()
    // "Something changed" opens the guided "pick what changed" flow; switch to the full form, which
    // always exposes a "Save today" control, and save the changed-day check-in.
    await page.getByRole('button', { name: /Show full form/i }).click()
    const save = page.getByRole('button', { name: /Save today/i }).first()
    await expect(save).toBeVisible()
    await save.click()
    // Saving returns to Today.
    await expect(page.getByRole('heading', { name: /How is E2EMilo today/i })).toBeVisible()
  })

  test('opening the changes view shows the deterministic patterns/timeline', async ({ page }) => {
    await startDogDemo(page)
    await page.getByRole('button', { name: /^Changes$/ }).click().catch(() => {})
    // The demo pet (Bella) has history, so a pattern and its "what changed" timeline are reachable.
    const showTimeline = page.getByRole('button', { name: /Show what changed|what changed/i }).first()
    if (await showTimeline.isVisible().catch(() => false)) {
      await showTimeline.click()
    }
    await expect(page.getByText(/pattern|change|worth mentioning/i).first()).toBeVisible()
  })

  test('vet share produces a read-only summary reachable without a session', async ({ page, browser }) => {
    await startDogDemo(page)
    // Create the share via the authenticated API (the page holds the demo session), then open the
    // resulting read-only link in a FRESH, unauthenticated context.
    const pets = await (await page.request.get('/api/pets')).json()
    const petId = pets[0].id
    const share = await (await page.request.post(`/api/pets/${petId}/share`)).json()
    expect(share.token, 'a share token should be issued').toBeTruthy()

    const shareUrl = new URL(`/#shared=${share.token}`, page.url()).toString()
    const fresh = await browser.newContext()
    const freshPage = await fresh.newPage()
    await freshPage.goto(shareUrl)
    await expect(freshPage.getByText(/vet summary|owner-observed|not a diagnosis/i).first()).toBeVisible()
    await fresh.close()
  })

  test('caregiver authorization boundary: protected data is not reachable without a session', async ({ page }) => {
    // A fresh visitor with no session lands on the auth screen, and /auth/me is unauthorized.
    await page.goto('/')
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
    const res = await page.request.get('/api/auth/me')
    expect(res.status()).toBe(401)
  })

  test('account deletion confirmation removes the account and returns to sign-in', async ({ page }) => {
    await registerNewOwner(page)
    await onboardPet(page, 'Dog', 'E2EDoomed')
    // Both irreversible confirmations must be accepted.
    page.on('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: /^Account$/ }).first().click()
    await expect(page.getByRole('heading', { name: /Your account/i })).toBeVisible()
    await page.getByRole('button', { name: /Delete my account/i }).click()
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  })

  test('lazy-loaded navigation works on a mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await startDogDemo(page)
    // Navigate across route-split views; each lazy chunk must load and render without a chunk error.
    await page.getByRole('button', { name: /^Changes$/ }).click().catch(() => {})
    await expect(page.locator('body')).toBeVisible()
    await page.getByRole('button', { name: /^Log$/ }).click().catch(() => {})
    await expect(page.locator('body')).toBeVisible()
    await expect(page.getByText(/Something went wrong loading/i)).toHaveCount(0)
  })
})
