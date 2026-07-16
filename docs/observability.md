# Observability & launch-readiness (reset email, error tracking, analytics)

Three launch-readiness integrations, all **optional and env-driven**. With nothing
configured they are silently off, so dev and a bare-bones deploy run unchanged.
None of them ever carry pet notes, symptoms/signs, food/medication text, or health
content off the box.

---

## 1. Password reset

A forgot/reset flow (`POST /api/auth/forgot-password`, `POST /api/auth/reset-password`).
Tokens are random, stored only as a SHA-256 hash, single-use, and expire.

### Email provider (env-driven)

| Variable | Default | Meaning |
|---|---|---|
| `PETPATTERN_MAIL_ENABLED` | `false` | `false` = **don't send**; the reset link is written to the backend log (dev / tiny-beta fallback). `true` = send via SMTP. |
| `PETPATTERN_MAIL_FROM` | `PetPattern <no-reply@petpattern.app>` | From address. |
| `SMTP_HOST` / `SMTP_PORT` | – / `587` | Your transactional email provider (Postmark, SES, Mailgun…). A `JavaMailSender` is auto-configured **only when `SMTP_HOST` is set**. |
| `SMTP_USERNAME` / `SMTP_PASSWORD` | – | SMTP credentials. |
| `SMTP_AUTH` / `SMTP_STARTTLS` | `true` / `true` | SMTP auth + STARTTLS toggles. |
| `PETPATTERN_RESET_TTL_MINUTES` | `60` | Link lifetime. |

**Enable in prod:** set `PETPATTERN_MAIL_ENABLED=true` and the `SMTP_*` values in `.env`.
**Dev / disabled:** leave the defaults. Requesting a reset logs
`Mail is disabled — password reset link (dev only): https://…/#reset=<token>` —
open that link to complete the flow locally.

### Security / privacy decisions

- **No account enumeration.** `forgot-password` always returns the same neutral
  message ("If an account exists for that email, we've sent reset instructions."),
  whether or not the email exists. Rate-limited to 5/min/IP.
- **One-time + expiring.** A token works once; redeeming it (or requesting a new
  one) invalidates it. Invalid/expired/used all return one identical message.
- **Session revocation.** A successful reset deletes all of that account's
  sessions, so an old password can't keep anyone signed in.
- The email body contains only the reset link — no pet or account detail.

---

## 2. Error tracking (Sentry-ready)

Sentry SDKs are wired into both backend (Spring) and frontend (React) but stay
**completely dormant until a DSN is set** — an empty DSN means no init and nothing
sent, so dev throws no errors and needs no config.

| Variable | Where | Default | Meaning |
|---|---|---|---|
| `SENTRY_DSN` | backend (runtime) | empty | Backend DSN. Empty = disabled. |
| `SENTRY_ENVIRONMENT` | backend + frontend | `production` | Environment tag. |
| `SENTRY_TRACES_SAMPLE_RATE` | backend | `0.0` | Performance sampling (0 = errors only). |
| `VITE_SENTRY_DSN` | frontend (**build-time**) | empty | Frontend DSN. Empty = disabled. Changing it requires rebuilding the frontend image. |

**Enable:** put `SENTRY_DSN` (backend) and/or `VITE_SENTRY_DSN` (frontend) in `.env`
and `docker compose -f docker-compose.prod.yml up -d --build`.
**Disable:** leave them empty (default).

### What is captured, and what is NOT

- **Captured:** unhandled server exceptions (stack traces) and uncaught browser
  errors / unhandled promise rejections.
- **Never sent (by config):**
  - `send-default-pii=false` (backend + `sendDefaultPii:false` frontend) — no user
    email, IP, cookies, or identity.
  - `max-request-body-size=none` (backend) — **request bodies are never attached**,
    so a check-in note or free-text field can't ride along in an error.
  - Frontend `beforeSend` strips `request.data/cookies/headers` and any `user`
    email/username/ip; `beforeBreadcrumb` drops console breadcrumbs (which can echo
    form state). Fetch breadcrumbs keep only URL + status (no bodies).
- Error **messages** in this app are generic ("Pet not found", "Email or password
  is incorrect") and don't include health content.

---

## 3. Product analytics (privacy-friendly, optional)

A tiny frontend beacon (`frontend/src/analytics.js`). **Off unless
`VITE_ANALYTICS_URL` is set.** It sends only a fixed event name + a timestamp
(`{ "event": "...", "ts": 1720000000000 }`) via `navigator.sendBeacon`. No cookies,
no identifiers, no pet/health data. Anything not on the allow-list is dropped.

| Variable | Where | Default | Meaning |
|---|---|---|---|
| `VITE_ANALYTICS_URL` | frontend (**build-time**) | empty | Collector endpoint that accepts `POST {event, ts}`. Empty = disabled. Change = rebuild frontend image. |

Point it at a privacy-friendly collector (self-hosted, or a Plausible-style
custom-event proxy). The goal is the **activation/retention funnel**, not medical data.

### The seven events

| Event | Fired when |
|---|---|
| `registered` | a new account is created |
| `pet_created` | a pet is added (onboarding) |
| `checkin_created` | a daily check-in / quick log is saved |
| `pattern_viewed` | the Patterns view is opened |
| `vet_summary_viewed` | the Vet summary view is opened |
| `export_clicked` | "Export my data" is clicked |
| `account_deleted` | an account is deleted |

**No event carries a pet name, note, symptom/sign, count, email, or any
health content** — only the name above and a timestamp. To add an event you must
extend the allow-list in `analytics.js`, which keeps accidental fields out.

### 3b. Internal analytics store + retention (backend)

The frontend beacon above ships events off-site but keeps no history, so **D1/D7/D30
retention is unmeasurable from it alone**. The backend now records the same seven
touchpoints server-side into an internal store (`analytics_event`, Flyway **V14**) so the
activation funnel and retention are measurable **without any third-party** and **without
storing identity**.

- **Pseudonymous ref.** Each row is keyed by a one-way `SHA-256(owner id + ref-salt)` — never
  the owner id or email. It is stable per owner (so retention works) but not reversible
  without both the id and the secret salt. On account deletion the row survives (no FK); it is
  pseudonymous, non-identifying aggregate data, disclosed in the privacy policy.
- **What is stored:** ref, allow-listed event `type`, UTC timestamp + calendar day, platform
  (`web`/`android`/`ios`), optional app version, schema version, and small **allow-listed
  categorical meta** (only `species` ∈ the Species enum, `mode` ∈ quick/full/changed/…).
  Anything else — names, notes, symptoms, emails, free text — is dropped in `AnalyticsService`.
- **Recording is fail-safe:** it never throws into the request, and is a no-op when disabled or
  signed out.
- **Ingest** `POST /api/analytics/events` (authenticated) exists for platform-tagged client
  events (e.g. the mobile apps); the web funnel is recorded server-side and needs no client call.
- **Reporting** `GET /api/analytics/report` returns the funnel (distinct users per event) and
  **timezone-safe D1/D7/D30 retention** (UTC cohort by first-seen day; only cohorts old enough
  for day N to have elapsed are counted). It is **admin-guarded**: 404 when no token is
  configured, 403 without the `X-Analytics-Token` header, and never echoes a ref or identity.

| Variable | Where | Default | Meaning |
|---|---|---|---|
| `PETPATTERN_ANALYTICS_ENABLED` | backend | `true` | Master switch for server-side recording. |
| `PETPATTERN_ANALYTICS_REF_SALT` | backend | dev placeholder | Seeds the one-way pseudonym. Set a strong value in prod; changing it resets retention history. |
| `PETPATTERN_ANALYTICS_ADMIN_TOKEN` | backend | empty | Bearer token for the report endpoint (`X-Analytics-Token`). Empty = report disabled (404). |

---

## Quick reference: on/off per environment

| Integration | Dev (default) | Prod (enable) |
|---|---|---|
| Reset email | disabled → link logged | `PETPATTERN_MAIL_ENABLED=true` + `SMTP_*` |
| Backend Sentry | off (empty `SENTRY_DSN`) | set `SENTRY_DSN` |
| Frontend Sentry | off (empty `VITE_SENTRY_DSN`) | set `VITE_SENTRY_DSN`, rebuild frontend |
| Analytics beacon (frontend) | off (empty `VITE_ANALYTICS_URL`) | set `VITE_ANALYTICS_URL`, rebuild frontend |
| Internal analytics store (backend) | on; report disabled | set `PETPATTERN_ANALYTICS_REF_SALT` + `PETPATTERN_ANALYTICS_ADMIN_TOKEN` |
