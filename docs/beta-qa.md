# Manual beta QA checklist

Run this by hand against a running stack before inviting beta users. Local dev:
`http://localhost:7317`. On a deployed beta, use your `PUBLIC_ORIGIN` (https).

Tip: the top-right toggle switches EN/HR live. "Load Bella demo" gives you a
populated dog instantly (skips signup).

## Auth
- [ ] **Register** — create account: the **accept checkbox is required** (Create button stays disabled until ticked); the Terms / Privacy / Medical Disclaimer links open (new tab) and read cautiously.
- [ ] **Login** — sign out, sign back in with the same email/password → lands on Today.
- [ ] **Logout** — Sign out (top bar) returns to the sign-in screen.
- [ ] **Wrong password** — shows "Email or password is incorrect" (does not reveal whether the email exists).
- [ ] **Unknown email** — same generic message as wrong password.
- [ ] **Duplicate email** — registering an existing email → "An account with that email already exists".
- [ ] **Short password** (<8) — rejected with a clear message.
- [ ] **Expired / invalid session (401)** — with DevTools open, delete the `pp_session` cookie and reload (or wait for expiry) → app drops to the sign-in screen instead of erroring.

## Dog flow
- [ ] **Create dog** — onboarding: pick **Dog**, copy mentions food/stool/scratching/vomiting/energy, CTA "Start my dog's memory", then "…memory is ready → Log today".
- [ ] **Log check-in** — the dog form shows Scratching, Stool, Energy + Vomiting/Ear redness toggles; "Only log what you noticed" copy; save works.
- [ ] **Today** — Recent signals show dog signals (Scratching / Stool / Water / Appetite / Energy); status chip + headline read naturally.
- [ ] Log a few days (or use the Bella demo) so a pattern appears.

## Cat flow
- [ ] **Add pet → Cat** — "+ Add pet" in the switcher; pick **Cat**, copy mentions litter box/appetite/hiding/water/vomiting/weight.
- [ ] **Log check-in** — cat form shows Litter box, Appetite, Energy + Hiding more/Straining/Vomiting/Weight concern toggles; Urination change under optional details; **no** dog fields (scratching/stool).
- [ ] **Today** — Recent signals show cat signals (Litter box / Appetite / Water / Hiding / Energy).

## Food context
- [ ] **Add food change** — brand/product, protein, "new food" flag saves; appears as Current food on Today.
- [ ] After a new food + a few elevated days, the food shows up in the "what changed" timeline.

## Patterns / timeline / vet
- [ ] **Patterns** — cards read as "possible pattern", cautious, non-diagnostic ("worth discussing with your vet", "not a diagnosis"); confidence chip shows.
- [ ] **"What changed before this?"** (Show what changed) — a short story of food/med/symptom changes in date order + the medical disclaimer at the bottom.
- [ ] **Vet summary** — Bring this to your vet: sections read cleanly; dog shows a **Stool** section, cat shows a **Litter box & behavior** section; "Copy summary" / "Save as PDF" work; disclaimer present.
- [ ] **Vet share link** — create a link, open it in a private window (no login) → read-only summary renders; turning it off makes the link 404.

## Account (top bar → Account)
- [ ] **Export my data** — downloads `petpattern-export.json`; open it → your pets + logs are there, **no other user's data**, no image bytes, no share token.
- [ ] **Delete account** — double-confirm → account gone, dropped to sign-in; logging back in fails (account + data erased).

## Language
- [ ] **HR** — switch to HR: Today, Patterns, timeline, vet summary, recap all read as **natural Croatian** (not half-English). Numbers agree ("1 dan" / "5 dana"). Nothing sounds like a diagnosis or a chatbot.
- [ ] **EN** — switch back: everything English again. The public share link also follows the language.

## Mobile
- [ ] Open on a phone (or DevTools 375px): no horizontal scroll; nav is the 5 tabs; onboarding, check-in, and vet summary are usable one-handed.

## Password reset
(Dev: mail is off, so the reset link is printed in the backend log — `docker compose logs backend | grep "reset link"`. On a deployed beta with `PETPATTERN_MAIL_ENABLED=true`, it arrives by email.)
- [ ] **Forgot password** — on the sign-in screen, "Forgot your password?" → enter your email → shows the neutral "If an account exists…" message.
- [ ] **Unknown email** — same neutral message (does not reveal whether the email exists).
- [ ] **Open the link** — `#reset=<token>` opens the "Choose a new password" screen (no login needed); set a new password (min 8, must match) → "Password updated" → sign in with the **new** password.
- [ ] **Old password fails** — after reset, the old password no longer works.
- [ ] **Link is one-time** — reopening the same link → "This reset link is invalid or has expired."
- [ ] **Expiry** — a link older than `PETPATTERN_RESET_TTL_MINUTES` (default 60) → same invalid/expired message.

## Error tracking & analytics (only if enabled)
- [ ] With `SENTRY_DSN` / `VITE_SENTRY_DSN` unset, the app boots and runs with **no Sentry errors** in dev.
- [ ] With `VITE_ANALYTICS_URL` unset, **no analytics requests** are made (check the Network tab).
- [ ] If enabled: confirm analytics payloads are only `{event, ts}` — **no** pet names, notes, symptoms, or emails (Network tab).
