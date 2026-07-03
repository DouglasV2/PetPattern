# PetPattern Memory

## Product Rules

PetPattern is not an AI vet.

PetPattern is not a chatbot.

PetPattern is not a symptom Q&A app.

PetPattern is not a generic pet diary.

The core moat is longitudinal structured data: daily check-ins, food exposure, symptoms, and recurring context remembered over time.

The product thesis:

> ChatGPT answers questions. PetPattern remembers your dog.

## Language

Use human, pet-owner language:

- Bella today
- What changed?
- Possible pattern
- Normal for Bella
- Higher than usual
- Worth discussing with your vet
- Bring this to your vet

Avoid product framing that makes the app feel like a generic AI wrapper.

Avoid medical overclaiming. PetPattern can surface a possible pattern, but it should not claim cause, allergy, disease, or a treatment path.

## AI Later

AI may become useful later for:

- extracting structured events from messy owner notes
- summarizing a vet-ready history
- explaining deterministic patterns in clearer language

AI should remain an assistant to the longitudinal memory, not the product itself.

## AI Rules (Sprint 7)

- AI is only for extraction and explanation. It suggests structured fields from a
  free-text note; it does not decide anything.
- The deterministic pattern engine remains the source of truth. AI never produces
  a pattern, a diagnosis, or a treatment plan.
- Owner confirmation is required before saving any AI-suggested data. Suggestions
  populate an editable form, and nothing is written until the owner taps save.
- AI must never crash the app. With no API key configured, a deterministic local
  reader runs and the response says so clearly.
- The provider is pluggable (Sprint 10): a hosted model (Anthropic Haiku) can be
  switched on by config, but the deterministic mock stays the default and the
  confirm-before-save rule is unchanged.

## Pattern Memory (Sprint 8)

PetPattern remembers possible patterns over time, not just per request:

- Each pattern is persisted with how long it has been seen and how many distinct
  days it has recurred ("seen 3× since May"). This recurrence is the literal
  expression of "remembers your dog".
- The owner has the final say. They can mark a pattern acknowledged, resolved,
  not relevant, or told-my-vet. Dismissed patterns are demoted and never nag on
  Bella today, but the deterministic engine keeps detecting underneath.
- The engine stays the source of truth; the memory layer only annotates and
  remembers what the engine found.

Engine v2 (Sprint 9) builds on this: detection adapts to each dog's own
variability instead of fixed thresholds, and a pattern that stops recurring
"settles" and fades out on its own. New pattern types are expected to keep
arriving, so pattern type is stored as a plain string (no brittle enum
constraint).

## Retention (Sprint 11)

The product only works if the owner keeps logging, so Bella today shows a streak,
30-day coverage, and a calm nudge — never a guilt trip. An in-app daily reminder
is honest about its limits: it only fires while the app is open. Real push/email
(when the app is closed) needs accounts + infra and is parked under Route A.

## Localization (Sprint 13)

The frontend is bilingual (EN default + Croatian) via a tiny i18n layer where the
English string is its own key, so coverage degrades gracefully to English and the
brand stays English by default. A header toggle switches live and persists.

**Backend i18n (done):** backend-generated copy (pattern cards, timeline, Today,
vet summary + plain text, recap, trial verdicts, AI warnings, common errors) is
now localized the same way — `api.js` sends `Accept-Language`, Spring's
LocaleContextHolder resolves it, and a static `Copy.t` maps English-as-key → one
HR map, English fallback always safe. Croatian style is a hard rule: natural,
cautious, no declined pet names (HR templates drop the name and restructure),
no gendered participles, species-appropriate wording (dog: češanje/stolica/uši;
cat: pijesak/mokrenje/napinjanje/skrivanje). The same pass softened English
causal phrasing ("flare-up", "symptoms picked up" → "were logged after…").
Debt: owner-entered text stays as written (correct); "settled" pattern cards
keep the stored language from when they were last detected.

## Daily-loop hooks (Sprint 14)

Engagement is earned, never nagged. Three quiet hooks live on Bella today:

- **Same as yesterday** — a one-tap quick log that clones the steady signals and
  resets the acute flags, so a busy day is still a logged day.
- **Good news** — a warm line that appears *only* when scratching or stool
  genuinely eased after a recent rough patch (and only when stool was actually
  recorded recently — a gap in logging is never read as improvement). No fake wins.
- **Watch out** — a gentle heads-up after a new food/treat in the last few days,
  pointing at the days that matter. A nudge, never a warning.

Hard rule reinforced this sprint: **no copy may sound AI-generated and no UI may
look like generic AI SaaS** — that drives owners away. Concretely: no "Insights",
no Sparkles/✨ "AI feature" affordance, no self-narration ("PetPattern learns…",
"you stay in control"), no internal jargon leaking to owners ("baseline",
"exposure windows", "deterministic pattern crossed threshold"), no chirpy streak
filler. Voice stays specific, understated, about the dog. Croatian must read as
natural Croatian, not machine translation (avoid name-suffix contractions like
"{name}inu" → prefer "za {name}"; avoid gendered first-person verbs in UI labels).

## Photo diary (Sprint 15)

Photos add a visual, emotional layer to the record and a clinically useful one
(an ear or skin patch shown to a vet over time). Stored as bytea in the existing
Postgres volume — no separate file store. Grouped by body area so the same spot
lines up chronologically; also shown as a strip on Bella today and inline on the
timeline next to the change they sit beside. The seed deliberately ships NO
photos — synthetic placeholder images read as fake/AI and would break the no-AI
rule, so the gallery shows an honest empty state until real photos are added.
Kept deliberately calm and non-AI: a plain camera affordance, no "AI vision" or
"smart" framing, warm flat palette. Uploads are hardened for the no-auth pilot
(raster-only allowlist so a stored file can never be served as script, nosniff,
per-pet count cap, metadata-only gallery query, client-side resize).

## Food-elimination trial (Sprint 16)

The differentiator for food-sensitive dogs: a guided "remove one ingredient for
a few weeks, keep logging, then bring it back" experiment. PetPattern computes a
plain before/during/after comparison (avg scratching + unstable-stool days per
window) from the pet's own data, tracks adherence (a food with that protein
started mid-window = a slip), and writes a warm, NON-diagnostic verdict — what
the numbers did, never a cause or cure. Seed ships one completed chicken trial
that matches Bella's real data (calm while chicken was out, flare after it came
back). Stays calm/human, no AI/clinical framing.

## Recap & milestones (Sprint 17)

A periodic personal look-back ("Bella's last 30 days") so the owner feels their
effort added up. Computed deterministically from existing data: itching trend vs
the prior window, longest calm stretch, what they did (food changes/photos/trials),
total logged days, milestones. Warm, honest, NON-diagnostic — deliberately NOT
gamified (no trophies or hype; milestones are calm checkmarks). Reached
from a card on Bella today, not a nav tab (would be the 8th).

## Progressive disclosure (core beta)

The app must feel simple: a first-time owner should think "I can do this in 20
seconds a day," not face a health cockpit. Simple daily habit first; advanced
tools only when relevant. Primary nav is exactly five: Today, Log, Food,
Patterns, Vet. The advanced features stay but are contextual, NOT in nav:
Photos (inside Log "Add a photo if it helps" + timeline thumbnails), Food trial
(inside Food + food-trigger pattern detail), Recap (inside Patterns), AI note
(inside Log's Optional details). Never delete these features to "simplify" — hide
them, don't remove them. Log copy: "Only log what you noticed. A quick check-in
is enough." AI is a convenience, never the product. See [[petpattern-no-ai-voice]].

## Accounts & privacy (Route A, Phase 1)

The app is now multi-user: email + password accounts (BCrypt) with server-side
sessions in an HttpOnly cookie (`pp_session`; DB stores only the token's SHA-256
hash). `PetAccess` is the single guard — `currentOwner()` (401) and
`requireOwnedPet()` (404 for missing or not-yours); every pet-scoped controller
goes through it, so there's no cross-owner access (IDOR). The Bella demo is now a
demo account and "Load Bella demo" signs into it. Kept `ddl-auto=update`; cookie
not `Secure` on localhost (set in prod). This supersedes the old "no accounts,
shared demo DB" state.

**Phase 2 (done for migrations + tests):** Flyway now owns the schema —
`db/migration/V1__baseline.sql` is the baseline, `ddl-auto=validate`,
`baseline-on-migrate` for existing DBs. Verified on a wiped volume (V1 applies →
validate passes → app boots). The Docker build runs unit tests (engine, auth,
food-trials) via `mvn package` (no `-DskipTests`) — pure JUnit/Mockito, no DB
needed. Schema changes from now on are new `V2+` migrations, never entity-only.

## Hardening + medications (Route A tail + product)

Hardening: session-cookie `Secure` is env-driven (`PETPATTERN_COOKIE_SECURE`);
per-IP rate limits on login/register/AI (429); 5xx request logging. In-memory /
single-instance (pilot). Full error-tracking + JSON logs are future.

Medications: a `Medication` record (name, start, optional end = ongoing, notes),
owner-scoped via `PetAccess`, added via Flyway `V2__medications.sql` (the Phase-2
migration workflow — new entities now need a migration, since `ddl-auto=validate`).
Purely a passive record — NO dosing/treatment advice (non-diagnostic). Shown in
the vet summary; managed from `#medications` reached contextually (vet summary +
check-in optional details), not a nav tab. Seed: ongoing supplement + finished
ear-drops course.

## Vet sharing (read-only link)

The distribution loop: owner shares a read-only link to the vet summary; the vet
opens it without logging in. `VetShare` = unguessable token (SHA-256 hash stored,
90-day expiry, revocable, one active per pet); added via Flyway `V3`. Public
`GET /api/shared/vet-summary/{token}` (no auth, rate-limited, returns ONLY the vet
summary — no account/photos). Owner manages it in the vet summary ("Share with
your vet"); the vet opens `#shared=<token>` → a standalone read-only page (reuses
`VetSheet`, keeps the disclaimer), rendered before the login gate. Token never
re-echoed after creation (regenerate to get a fresh link).

## Multi-caregiver (invite / accept)

Two people can care for one dog — the network-stickiness moment. A pet keeps one
primary owner (the creator); anyone else is a caregiver, added only through a
consent-based invite → accept flow (invite by email so you can invite someone
before they even have an account; they must accept before they get access —
nobody is added silently). `PetAccess` now has two levels: `requireOwnedPet`
(owner OR accepted caregiver — every data endpoint, so a caregiver co-manages the
whole record) and `requirePrimaryOwner` (creator only — managing the care
circle). Both 404 for missing/not-yours/not-shared, so existence never leaks;
only the email-matched invitee can accept/decline (no invite-id guessing). Added
via Flyway `V4__caregivers.sql` (`pet_caregivers`, `pet_invites`; invites expire
in 14 days). The pending-invite banner shows on the first-run start screen too,
so a brand-new invitee with no pets of their own can still accept. Kept calm and
human; Croatian natural and gender-neutral. See [[petpattern-no-ai-voice]].

## Dogs + cats (species-specific, beta)

PetPattern supports **dogs and cats** for beta — with species-specific tracking
models, NOT a generic all-pet app. No rabbits/birds/reptiles/etc. until the
dog/cat beta is validated. Dogs track food/stool/scratching/vomiting/ear/appetite/
water/energy; cats track litter box/urination/straining/appetite/water/hiding/
vomiting/weight/energy. `Pet.species` routes onboarding copy, the daily check-in
fields, the Today signals, and the pattern engine (`CatSymptomAnalyzer` vs the dog
analyzers). Cat pattern language is cautious and NON-diagnostic — never implies a
specific disease (no urinary-blockage or kidney-disease framing); always "not a
diagnosis, worth discussing with your vet." Cat check-in fields are additive and
nullable (Flyway `V5`), so the Bella dog demo is unchanged. AI stays optional and
only assists extraction/explanation (dogs), never diagnosis. See
[[petpattern-no-ai-voice]].

## QA sweep (pre-beta)

Before opening the beta we ran a full QA pass: six scripted user journeys against
the live stack (dog owner, cat owner, edge cases, auth lifecycle, caregivers,
demo+AI) with independent reproduction of every finding, plus a manual UI pass
(mobile, empty states, both languages). Grounding rules that came out of it:
user-supplied text is length-validated at the API layer (never a raw DB error —
a 500 there leaked SQL schema once); a vet document never fabricates unknowns
(no "Adult" for a missing birth date); destructive actions on shared artifacts
belong to the primary owner alone (vet-share revoke, care circle); dates are
consistently server-UTC with a +1-day check-in tolerance for users east of UTC
(true per-user timezones deferred to real beta).

## Production readiness (beta prep)

The app is feature-complete for a beta; the gap to a real beta is deploy + trust
+ visibility, not features (matches the product thesis: not an endless feature
experiment). Shipped a prod pack: `docker-compose.prod.yml` (prod Spring profile,
secrets from gitignored `.env`, Postgres unpublished, restart + health-gated),
Actuator `/actuator/health`, JSON logs in prod (logback built-in encoder),
HTTPS-only cookie, `/api/dev/seed` gated + rate-limited, DB backup/restore scripts
(`ops/`), and `DEPLOY.md` (TLS via a reverse proxy like Caddy). Dev
`docker-compose.yml` is unchanged. Still operator-side before real users: host +
domain + TLS, off-host backups, and an email provider (for password reset). Next
tracks offered but not yet done: trust/privacy (account deletion + data export +
signup disclaimer), backend Croatian i18n, error tracking (Sentry) + retention
analytics.

## Trust & privacy (GDPR minimum)

Data trust is a beta blocker for a health-memory app, so before launch we added
the GDPR minimum (no new product features): terms/privacy/medical-disclaimer
acceptance at registration (required checkbox + server-enforced; `Owner` stamps
three timestamps, Flyway `V6`), self-service **data export** (`GET
/api/account/export`, scoped to the current user — owned pets in full, photo
metadata only, caregiver-only pets as a minimal association, no other owner's
data), and permanent **account deletion** (`DELETE /api/account` — hard-deletes
the owner's pets and all their data + the owner's caregiver links elsewhere +
invites + sessions, in FK-safe order; a caregiver deleting their account never
touches the owner's pet). Legal pages (bilingual `legal.js`) are public at
`#privacy`/`#terms`/`#disclaimer`; the account screen is in the top bar, not the
nav. Language stays cautious/non-diagnostic. Still open (needs an email provider):
password reset. See [[petpattern-no-ai-voice]].

## Core Product Moments

- The core "aha" moment is "What changed before this?" — a short, story-shaped
  timeline of food and signal changes before a possible pattern.
- The second value moment is "Bring this to your vet" — a calm, owner-reported
  summary that makes a vet conversation more useful.
- Both stay non-diagnostic: possible pattern, worth tracking, worth discussing
  with your vet, not a diagnosis.
