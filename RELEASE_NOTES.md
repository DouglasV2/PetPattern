# PetPattern v0.1.0-beta — Release Notes

PetPattern is a **longitudinal pet health-memory app**. Owners log small daily
signals over time; PetPattern surfaces recurring, easy-to-miss patterns and turns
them into a calm, vet-ready summary. It is not a chatbot, not an AI vet, and not a
symptom Q&A app — the value is the remembered record.

This is the first closed **beta**. Expect rough edges; your data is real and
survives (backed up), but the product is still being validated.

## What it does

- **Accounts** — email + password, private per owner. At sign-up you accept the
  Terms, Privacy Policy, and Medical Disclaimer. Forgot-password reset is
  supported (via email, when a mail provider is configured).
- **Species-specific tracking** — 10 species. Dogs (scratching, stool, vomiting,
  ear redness, appetite, water, energy, food changes/treats) and cats (litter box,
  urination, straining, hiding, vomiting, appetite, water, energy, weight concern)
  have the deepest models; rabbits, guinea pigs, hamsters, birds, reptiles, turtles,
  fish/aquariums and other small pets have species-appropriate starter tracking.
  Each has its own onboarding, daily check-in, and pattern language.
- **Immediate urgent observations** — a non-diagnostic "worth a vet call today"
  layer that reacts to the latest entry, independent of pattern history.
- **Deterministic patterns** — cautious, non-diagnostic "possible patterns" from
  your own logs (e.g. scratching above the recent normal, a possible food-related
  pattern, a litter-box change), remembered over time.
- **"What changed before this?"** — a short timeline of food/medication/signal
  changes in the days before a pattern.
- **Vet summary** — a copyable / printable, owner-reported summary for a vet
  visit, plus an optional read-only **share link** (no login for the vet).
- **Medications, photos, food-elimination trial, monthly recap** — supporting
  tools, reachable in context (not cluttering the main nav).
- **Multi-caregiver** — invite a partner / dog-walker to co-log a pet (they
  accept first; nobody is added silently).
- **Bilingual** — English + Croatian, backend narratives included, switchable
  live.
- **Your data rights** — export everything as JSON, or permanently delete your
  account and all its data, from the Account screen.

## What it does NOT do (by design, this beta)

- No diagnosis, treatment advice, or medication dosing. It describes what was
  logged; it never names a cause, an allergy, or a disease.
- No AI chat / assistant. (A local note-reader can *suggest* check-in fields from
  a free-text note; it never decides anything and is off the critical path.)
- No product dashboards, no subscription/billing, no push. Password-reset email
  and a privacy-safe funnel analytics beacon are optional and stay off unless
  configured — no marketing email, and analytics never sees health content.

## Known limitations

- **Password reset needs email configured.** The forgot/reset flow ships, but
  sending real email requires an SMTP provider (`PETPATTERN_MAIL_ENABLED` +
  `SMTP_*`). Left unconfigured, reset links are written to the backend log rather
  than emailed. See [`docs/observability.md`](docs/observability.md).
- **Timezones are server-UTC.** "Today" and streaks use UTC; check-ins accept up
  to +1 day so users east of UTC can still log "their" today. True per-user
  timezones are future work.
- **Single instance.** Rate limiting and sessions are in-memory/DB on one node;
  no horizontal scaling yet.
- **Observability is opt-in.** JSON logs + `/actuator/health` always; error
  tracking (Sentry) and privacy-safe funnel analytics are available but off unless
  their env vars are set. See [`docs/observability.md`](docs/observability.md).
- **Language nuance.** Owner-entered text (notes, food/medication names) stays in
  whatever language it was typed. A "settled" (no-longer-detected) pattern card
  keeps the language it was last detected in.
- **Cat coverage is newer** than dog and has had less real-world data; cat
  pattern thresholds may need tuning during the beta.

## Medical disclaimer

PetPattern does not diagnose or replace veterinary care. What it shows are
**possible patterns based on owner-reported logs** — meant to help you notice
changes worth discussing with your vet. It is **not a diagnosis** and **not a
substitute** for professional veterinary care. If your pet may be unwell, or in
an emergency, contact your veterinarian. Full text: the in-app Medical Disclaimer
(`#disclaimer`).

## Deploying

See [`DEPLOY.md`](DEPLOY.md). Summary: hosted Postgres + backend + frontend via
`docker-compose.prod.yml` behind a TLS reverse proxy; secrets in `.env`; schedule
`ops/backup-db.sh` and copy backups off-host.
