# PetPattern — Launch QA Checklist

Manual pre-ads checklist for the **soft public launch**. Run through it on a
production-like deploy (real HTTPS origin), in **both English and Croatian**, on
**desktop and a real phone**. Check the box only after you've seen it work.

> PetPattern is a private pet **health-memory** record. It is **not** a vet, a
> diagnosis tool, or an AI chatbot. Copy must stay cautious — see §10.

---

## 0. Production config prerequisites (do these first)

These are configured in `.env` (copied from `.env.example`) and read by
`docker-compose.prod.yml`. Nothing here is a code change.

- [ ] `PUBLIC_ORIGIN` is your real **https** origin (not localhost). The session
      cookie is `Secure`, so login breaks on plain http.
- [ ] TLS reverse proxy terminates HTTPS and forwards to the frontend
      (`127.0.0.1:7317`). See `DEPLOY.md` §2–3.
- [ ] `POSTGRES_PASSWORD` is a long random value; Postgres has **no** published
      port in prod (internal network only).
- [ ] `PETPATTERN_DEMO_ENABLED=false` for a public launch (default in prod). Only
      `true` in a separate, isolated demo environment.
- [ ] `PETPATTERN_MAIL_ENABLED=true` **and** all `SMTP_*` set — otherwise real
      users cannot reset their password.
- [ ] Google (optional): all three of `GOOGLE_OAUTH_CLIENT_ID`,
      `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI` set, and the
      redirect URI matches the Authorized redirect URI on the Google OAuth client.
      Leave all three empty to keep the button hidden.
- [ ] Any credential that ever sat in a shared `.env`/ZIP has been **rotated**
      (Google client secret, DB password, Anthropic key, SMTP password).
- [ ] Error tracking decided: `SENTRY_DSN` / `VITE_SENTRY_DSN` set, or
      intentionally left empty (off).
- [ ] Analytics decided: `VITE_ANALYTICS_URL` set to a privacy-friendly collector,
      or intentionally left empty (off).
- [ ] Bring the stack up: `docker compose -f docker-compose.prod.yml up -d --build`
      and confirm `docker compose -f docker-compose.prod.yml ps` shows all healthy.

---

## 1. Auth

- [ ] Email/password **signup** creates an account and lands logged in.
- [ ] Duplicate-email signup shows a neutral error (does not confirm the email exists).
- [ ] **Login** with correct credentials works; wrong password shows a helpful, non-leaky error.
- [ ] **Logout** returns to the signed-out screen and the session no longer works.
- [ ] **Google login** (if enabled): button appears, consent → returns logged in;
      cancelling returns with a non-alarming error, not a crash.
- [ ] **Reset password**: request link → email actually arrives (prod, mail enabled).
- [ ] Reset with a **valid** token sets a new password and invalidates old sessions.
- [ ] **Invalid** reset token shows a safe "link is invalid" state.
- [ ] **Expired** reset token (older than `PETPATTERN_RESET_TTL_MINUTES`) shows a safe expired state.

## 2. Pet setup

- [ ] Create a **dog** (name + species is enough).
- [ ] Create a **cat** (name + species is enough).
- [ ] **Optional fields** (breed, birth date, weight, sex) can be skipped and the pet still saves.
- [ ] **Switch pet** from the identity spine works.
- [ ] **Add pet** from the spine works.

## 3. Daily Log / Zapis

- [ ] Create the **first daily log** for a new pet (< 30 seconds, feels light).
- [ ] **"No change noticed" / "Nisam primijetio promjenu"** is visible on the Daily Log and saves a quiet day, returning to Today.
- [ ] **Dog-specific** fields show (itching 0/2/4/6/8/10, stool, ear redness…).
- [ ] **Cat-specific** fields show (litter box, hiding, straining…).
- [ ] **Optional notes** free-text field works and is saved.
- [ ] **Find / edit a past day** works (date lookup → edit or "log this day").
- [ ] Usable **one-handed on mobile**; the main "Save today" action is obvious.

## 4. Food / context / Hrana

- [ ] Add a food/context entry (main food or treat, protein, "new food").
- [ ] It appears in **Current food** on Today and in the food history.
- [ ] Copy is neutral context ("new food", "treat") — **no medical claims**.

## 5. Patterns / Obrasci

- [ ] With **insufficient data**, the empty state explains the baseline calmly ("Still learning normal for {name}…"), not broken/error.
- [ ] With **enough data**, possible patterns show **cautiously** ("possible pattern", "worth watching / discussing with your vet").
- [ ] The **evidence strip** renders; sparse data shows "A few more logs will make this easier to see."
- [ ] **No diagnostic wording** anywhere (no "diagnosis", "caused by", "allergy confirmed").

## 6. Vet summary / Sažetak za veterinara

- [ ] **Generate** a summary from logged data.
- [ ] Empty state (no logs) explains that logging a few days makes it clearer — not a dead end.
- [ ] **Share link** opens the read-only summary in a **private/incognito** window (unauthenticated).
- [ ] **Revoke** the share link → the same link now 404s.
- [ ] Summary copy stays "clearer notes for your vet", never a diagnosis.

## 7. Privacy / account

- [ ] **Export** account data downloads a JSON with owner + pets + logs + food + patterns.
- [ ] **Delete account** removes pets, check-ins, food logs, patterns, share links, and photos (if any); the account can no longer log in.
- [ ] Analytics (if enabled) send **only** fixed event names + timestamp — **never** pet names, notes, symptoms, emails, or health fields (verify in the network tab / collector).

## 8. Suggest fields / "Write what happened"

- [ ] With the default provider (`mock`), the **"Suggest fields" button is hidden**; the free-text note stays.
- [ ] If a real AI provider is configured (`PETPATTERN_AI_PROVIDER=anthropic` + key), the button appears **only for dogs**, never applies automatically, and requires an explicit click to apply.
- [ ] Suggestion chips are **localized** (not raw English) and itching is snapped to 0/2/4/6/8/10.
- [ ] Negation is respected — see the reliability cases in `MockAiProviderTest`
      ("nije povraćala", "nije bilo proljeva", "no vomiting", "no diarrhea" do **not** flip a flag on).

## 9. Mobile

- [ ] **No horizontal page scroll** on any screen (test 360–430px width).
- [ ] Daily Log is usable **one-handed**; buttons are tappable (≥ ~40px).
- [ ] The notebook shell (identity spine + record index) is usable; the language dropdown stays on-screen.
- [ ] Forms don't overflow; long locales (HR/EN) wrap cleanly.

## 10. Medical wording (spot-check)

Copy must **never** use: diagnosis, treatment recommendation, allergy confirmed,
therapy, cure, "symptoms indicate", "caused by", disease prediction. It **may**
use: possible pattern, worth watching, worth discussing with your vet, based on
owner-reported logs, care note, medicine given, what changed, may be related.

- [ ] Onboarding, Today, Patterns, Vet summary, disclaimer, and any email read cautiously.
- [ ] Disclaimer is present ("not a diagnosis, not a substitute for a vet").

## 11. Navigation / shell

- [ ] No generic SaaS top navbar; pet identity lives in the left record spine.
- [ ] Main nav stays focused: **Zapis · Hrana · Obrasci · Vet**; advanced tools (photos, medications, trials, caregivers, recap) don't dominate first use.

## 12. Security / production

- [ ] HTTPS works end to end; the session cookie is `Secure` + `HttpOnly` + `SameSite=Lax`.
- [ ] CORS `allowed-origins` is your origin (not `*`).
- [ ] Security headers present on the frontend (CSP, X-Frame-Options DENY, X-Content-Type-Options, Referrer-Policy, HSTS).
- [ ] Backend logs contain **no** raw reset/share/session tokens and **no** pet notes/health content.
- [ ] `GET /actuator/health` returns `UP`; no other actuator endpoints exposed.
- [ ] Backups scheduled + copied **off-host** (`DEPLOY.md` §4).

---

### First-use sanity (10-second test)

Open the app as a brand-new user and confirm the takeaway is obvious within ~10s:

> *"I log small changes. PetPattern remembers them over time. I can bring a
> clearer summary to the vet."*

- [ ] Daily Log / Zapis is clearly the main action.
- [ ] Optional fields don't overwhelm onboarding.
- [ ] The first week reads as building a calm baseline/memory — **no streaks/gamification**.
