# PetPattern Architecture

PetPattern is a full-stack pilot for longitudinal dog health memory.

## Frontend

- React + Vite app in `frontend/`.
- Local dev port: `http://localhost:7317`.
- The app uses lightweight hash routes. Primary navigation shows only the five
  core tabs: `#today`, `#check-in` (Log), `#food`, `#patterns`, `#vet`.
- Advanced routes still exist and stay reachable, but only contextually (never in
  the primary nav — progressive disclosure):
  - `#timeline` — the "What changed before this?" detail for a selected pattern.
  - `#photos` — the photo diary; reached from Log ("Add a photo if it helps").
  - `#trial` — the food-elimination trial; reached from Food and from a
    food-trigger pattern's detail ("Track a careful food trial").
  - `#recap` — the periodic look-back; reached from Patterns ("See your last 30 days").
- The first product screen is "Bella today", the calm emotional home — not a
  dashboard. It answers: is Bella normal, what changed, anything worth watching,
  what to do next.

## Progressive disclosure (core beta)

The advanced features are genuinely useful but must not make a first-time owner
feel they have to track everything. The design principle: show the simple daily
habit first (a ~20-second check-in), and surface advanced tools only where they
are relevant. So Photos, Food trial, Recap and AI-assisted logging are kept in
full but pulled out of the primary navigation and offered contextually (see the
routes above). The Log screen groups inputs into "How was Bella?", "Anything
unusual?" and a collapsed "Optional details" (appetite, water, free-text note,
photo), with the reassurance that only what was noticed needs logging. AI is a
convenience inside Log, never framed as the product.

## Backend

- Spring Boot app in `backend/`.
- Local API port: `http://localhost:8317/api`.
- Dates are server-UTC everywhere (streaks, "today", ranges). The frontend's
  `today` is UTC too, so the app is self-consistent; check-ins additionally
  accept +1 day so users east of UTC can log "their" today right after their
  midnight. Per-user timezones are a real-beta item.
- User-supplied text is length-validated at the request layer (notes 1200, pet
  name/breed 120, food brand/product 255, display name 120; medication/trial
  notes clamped) so oversized input gets a clean 400, never a DB error.
- Main domain objects:
  - `Pet`
  - `DailyCheckIn`
  - `FoodLog`
- Main API endpoints:
  - `GET /api/pets`
  - `GET /api/pets/{petId}/overview`
  - `GET /api/pets/{petId}/check-ins`
  - `POST /api/pets/{petId}/check-ins`
  - `GET /api/pets/{petId}/check-ins/latest`
  - `DELETE /api/pets/{petId}/check-ins/{checkInId}`
  - `GET /api/pets/{petId}/food-logs`
  - `POST /api/pets/{petId}/food-logs`
  - `GET /api/pets/{petId}/food-logs/current`
  - `DELETE /api/pets/{petId}/food-logs/{foodLogId}`
  - `GET /api/pets/{petId}/patterns`
  - `POST /api/pets/{petId}/patterns/{patternKey}/status`
  - `GET /api/pets/{petId}/patterns/{patternId}/timeline`
  - `GET /api/pets/{petId}/patterns/timeline?type=POSSIBLE_FOOD_TRIGGER` (fallback)
  - `GET /api/pets/{petId}/vet-summary` (optional `?days=30`)
  - `POST /api/ai/parse-daily-note`

## Backend i18n (HR end-to-end)

Backend-generated user-visible text (pattern cards, "What changed before this?"
timeline, Today explanations/nudges, vet summary incl. the copyable plain text,
recap, food-trial verdicts, AI-reader warnings, and the common auth/validation
errors) is localized server-side. Mechanism, deliberately mirroring the
frontend: `frontend/src/api.js` sends `Accept-Language` from the active UI
language on every request; Spring MVC resolves it into `LocaleContextHolder`
(built-in, no custom filter); a static `i18n/Copy.t(english, args)` uses the
**English string as the key** with one Croatian override map in `Copy.java` —
anything untranslated falls back to English gracefully. Helpers handle Croatian
pluralization (`Copy.days/years`), protein names (`Copy.protein`), and
locale-aware date formatting (recap months, trial dates; frontend `formatDate`
follows the UI language too).

Croatian style is a hard rule: natural, short, cautious ("mogući obrazac",
"vrijedi spomenuti veterinaru", "zabilježeno je", "nije dijagnoza"); pet names
are never declined — HR templates may deliberately drop the `{0}` name
placeholder and restructure instead. The same pass softened the English:
"flare-ups" and "symptoms picked up" became "were logged after…", and the
last jargon ("no deterministic threshold crossed") became plain language.

Known debt: owner-entered text (notes, medication/food names) stays in the
language the owner wrote it (correct); a "settled" pattern card shows the
stored text from the language active when it was last detected.

## Localization (Sprint 13)

The frontend has a lightweight i18n layer (`frontend/src/i18n.js`): the English
string is its own key and default, so wrapping a string with `t()` is a no-op in
English and any untranslated string falls back to English gracefully. A header
toggle switches EN/HR live and persists the choice in localStorage. Croatian
covers the static UI copy (~150 strings). Content generated by the backend
(pattern explanations, timeline events, the vet summary, AI warnings) is still
English; localizing it is a separate backend i18n pass.

## Database

- PostgreSQL via Docker Compose.
- Host port: `localhost:15437`.
- Internal Docker port: `5432`.
- Hibernate `ddl-auto: update` is used for the pilot.

## Deterministic Pattern Engine

The pattern engine lives in `com.petpattern.patterns`.

It is intentionally deterministic and rule based:

- `PatternEngine` coordinates the analysis.
- `BaselineCalculator` computes recent and historical comparison windows.
- `SymptomTrendAnalyzer` detects itching, stool, and water changes.
- `FoodExposureAnalyzer` checks repeated post-food exposure windows.
- `PatternExplanationBuilder` creates cautious, pet-owner-friendly explanations.

Current pattern types:

- `ITCHING_ABOVE_BASELINE`
- `STOOL_INSTABILITY`
- `WATER_DROP`
- `POSSIBLE_FOOD_TRIGGER`
- `RECURRING_EAR_REDNESS`

### Engine v2 (Sprint 9)

- The itching threshold is adaptive per dog: the recent rise must clear
  `max(1.8, stdDev(baseline))`, so a steady dog is flagged on a small rise while
  a naturally variable dog needs a bigger one (avoids crying wolf).
- Auto-fade: a remembered pattern the engine no longer detects is surfaced as
  "settled" (`currentlyDetected=false`) for 30 days, then drops off.
- `PatternObservation.type` is stored as a plain string, so adding new pattern
  types never collides with a stale enum CHECK constraint under `ddl-auto`.

## Pattern Timeline Service

`PatternTimelineService` (in `com.petpattern.patterns`) builds the "What changed
before this?" story for a single pattern.

- It re-runs the deterministic engine and resolves the pattern by its stable id
  (`{petId}:{TYPE}` or `{petId}:{TYPE}_{PROTEIN}`), or by type for the fallback route.
- It picks a window per pattern type (a food-trigger anchors on the related food
  log; itching/stool/water look back from the latest day).
- It emits a **change-point event** only when a signal actually shifts: food
  started, scratching rose, stool softened, water dropped, ear redness or
  vomiting onset, or an owner note. The result reads like a story, not a table.
- Events are `FOOD_STARTED`, `ITCHING_CHANGE`, `STOOL_CHANGE`, `WATER_CHANGE`,
  `CHECK_IN_SYMPTOM`, `NOTE`, and a closing `PATTERN_DETECTED` marker.

## Pattern Memory

The deterministic engine recomputes candidates on every request and is
stateless. `PatternMemoryService` (in `com.petpattern.patterns`) is the
longitudinal layer around it:

- A `PatternObservation` row (keyed by pet + the candidate's stable
  `patternKey`) remembers each possible pattern between requests:
  `firstDetectedDate`, `lastDetectedDate`, a `detectionCount` bumped once per
  calendar day, and the owner's `PatternStatus`.
- `GET /patterns` records today's detection and returns every current candidate
  enriched with status and history; dismissed patterns sort last.
- The Bella-today overview uses a read-only, active-only view, so dismissed
  patterns never nag.
- `POST /patterns/{patternKey}/status` stores the owner's decision
  (NEW, ACKNOWLEDGED, SHARED_WITH_VET, RESOLVED, NOT_RELEVANT). The engine keeps
  detecting, but this judgement sticks across detections.

The engine remains the source of truth; this layer only annotates and remembers
what the engine already found — it never invents a pattern.

## Vet Summary Service

`VetSummaryService` (in `com.petpattern.vet`) organizes owner-reported history
into a vet-ready summary for a date range (default 30 days, clamped 7-180).

- Sections: pet identity, date range, owner-observed concern, recent check-in
  summary, food exposure history, stool changes, water/appetite/energy notes,
  possible patterns, owner notes, and a disclaimer.
- It also returns a `plainText` rendering of the same content for one-click copy
  and printing on the client.
- It describes what was logged; it never produces a diagnosis or treatment plan.

## AI-Assisted Logging

AI is a low-friction input helper, never the product and never a chatbot.

- `AiProvider` abstracts extraction. The default `MockAiProvider` is a
  deterministic, dependency-free keyword reader used when no AI backend is
  configured. A real LLM-backed provider can be added later without touching the
  controller or the confirm-before-save flow.
- `AiExtractionService` runs the provider, keeps the request alive if the
  provider fails, attaches honest warnings (including "AI is not connected here"
  when running on the fallback), and records a best-effort `AiParseAttempt` audit
  row.
- `POST /api/ai/parse-daily-note` returns a `DailyNoteExtractionResult` of
  suggested fields. Nothing is ever saved automatically; the frontend always
  shows a review-before-save step, and the owner edits before creating a
  `DailyCheckIn` or `FoodLog`.

## Retention (Sprint 11)

The moat only grows if the owner keeps logging, so the overview carries a
`RetentionSummary` derived from stored check-in dates: a streak (consecutive
days, counted only if the last log is today or yesterday), `loggedToday`,
`daysSinceLastCheckIn`, and `loggedDaysLast30`. Bella today renders this as a
gentle streak + coverage strip and a nudge. A per-pet daily reminder is stored
client-side (localStorage) and fires a browser notification while the app is
open; true push/email when the app is closed is deferred to Route A (accounts
and notification infra).

Engagement signals (Sprint 14) live on the overview too: a one-tap
"Same as yesterday" quick log (clones steady signals, resets acute flags), a
`goodNews` line that appears only when itching/stool genuinely eased after a
recent rough patch (the "it worked" payoff — never a fake win), and a
`watchOut` heads-up after a new food/treat started recently. All copy is kept
human and understated by design.

## Accounts & privacy (Route A, Phase 1)

The multi-user foundation for a real beta. `Owner` + `AuthSession` back email +
password auth: passwords are BCrypt-hashed (spring-security-crypto — not the full
Spring Security framework, so existing endpoints are untouched). Login issues a
high-entropy random token stored in an HttpOnly, SameSite=Lax cookie
(`pp_session`); the database keeps only the token's SHA-256 hash, so a DB leak
never exposes live sessions. Sessions expire after 30 days; logout revokes.

`SessionAuthFilter` resolves the cookie into a per-request `OwnerContext`
(ThreadLocal, cleared in `finally`) and never blocks — enforcement is
per-endpoint. `PetAccess` is the single choke-point: `currentOwner()` returns 401
when signed out, and `requireOwnedPet(petId)` returns 404 for a pet that is
missing *or* not the current owner's (existence is never leaked). Every
pet-scoped controller resolves its pet through `PetAccess`, so one owner can
never read or touch another's dog. `Pet` has a (DB-nullable) `owner` FK; listing
and creating pets are owner-scoped. `/api/dev/seed` creates a demo account and
signs into it, preserving the one-click "Load Bella demo".

The frontend gates the whole app behind an `AuthScreen` (login / register /
demo); requests send the cookie (`credentials: 'same-origin'`); a new owner sees
only their own dogs. Cookie `Secure` is omitted on http://localhost — set it in
production (https).

## Migrations & tests (Route A, Phase 2)

The schema is owned by **Flyway**, not Hibernate. `db/migration/V1__baseline.sql`
is the full baseline (10 tables with PKs, FKs, unique + enum-check constraints),
captured from the previously Hibernate-generated schema so it matches the
entities exactly. `spring.jpa.hibernate.ddl-auto` is now `validate` (Hibernate
only checks entities against the schema, never mutates it); `baseline-on-migrate`
lets an already-populated database baseline at V1 while a fresh database runs V1
to build the schema. Verified end to end on a wiped volume. All schema changes
from here on are new `V2+` migrations.

The Docker build runs unit tests (`mvn package`, no `-DskipTests`): the pattern
engine (`BaselineCalculator`, `SymptomTrendAnalyzer`), auth (`AuthService` —
hashing, wrong-password, session hashing + expiry), and the food-trial
computation (including a regression test for the null-itching NPE). They are pure
JUnit/Mockito unit tests, so the build needs no database.

## Hardening (Route A)

Beyond auth: the session cookie's `Secure` flag is env-driven
(`PETPATTERN_COOKIE_SECURE`, on for https/prod). A `RateLimitFilter` applies a
small in-memory, per-client-IP fixed-window limit to the abuse-prone endpoints
(login 10/min, register 5/min, AI parse 30/min → 429), and a
`RequestLoggingFilter` logs every 5xx with method/path/status/duration for
visibility. These suit a single-instance pilot; a distributed limiter and full
error tracking (Sentry) come with scale.

## Account & data rights (GDPR)

Because the value is owner-reported health data over time, data trust is a beta
requirement. Three pieces:

- **Terms acceptance.** `Owner` carries `acceptedTermsAt` / `acceptedPrivacyAt` /
  `acceptedMedicalDisclaimerAt` (Flyway `V6`, nullable). Registration requires a
  single confirmation (`RegisterRequest.acceptedTerms`) — enforced server-side in
  `AuthService.register` (400 if absent) and stamped on all three at once. The
  registration form gates the submit on a required checkbox with links to the
  legal pages; the demo `ensureOwner` stamps acceptance too.
- **Export** — `GET /api/account/export` (authenticated) returns a JSON copy via
  `ExportService`: the account fields, every owned pet in full (profile,
  check-ins, food logs, medications, trials, patterns, photo *metadata* only —
  never bytes, caregivers' emails, share expiry — never the token), and
  caregiver-only pets as a **minimal association** (`{petName, role}`) so no other
  owner's data leaks. Served as a file attachment; the frontend downloads it as
  `petpattern-export.json` from the account screen.
- **Delete** — `DELETE /api/account` (authenticated) runs `AccountService`: for
  each owned pet it wipes all children (check-ins, food, patterns, photos, trials,
  meds, vet shares, invites, caregiver links) then the pet, removes the owner's
  own caregiver associations on *other* people's pets (association only), deletes
  invites addressed to their email, deletes sessions, then the account row — a
  hard delete, in FK-safe order with explicit flushes. A caregiver deleting their
  account never touches the pets they only helped with; the primary owner keeps
  everything. The cookie is cleared in the response.

Both live under `AccountController` (`/api/account`), gated by
`PetAccess.currentOwner()` (401 when signed out). The legal pages (Privacy /
Terms / Medical Disclaimer, bilingual in `frontend/src/legal.js`) render before
the login gate at `#privacy` / `#terms` / `#disclaimer`; the account/settings
screen is reached from the top bar, not the primary nav.

## Production deployment

`docker-compose.prod.yml` is the production stack (dev `docker-compose.yml` is
unchanged). It runs the backend with `SPRING_PROFILES_ACTIVE=prod`, reads all
secrets from a gitignored `.env` (`.env.example` documents them; required ones
fail fast via `${VAR:?}`), keeps Postgres off any published port, sets
`restart: unless-stopped`, and gates startup on health. The `prod` profile
(`application-prod.yml`) forces the `Secure` session cookie and drops SQL
formatting; `logback-spring.xml` emits human-readable console logs in dev and
**JSON** in prod (logback's built-in encoder, no extra dependency). Spring
Actuator exposes only `/actuator/health` (+ liveness/readiness probes, no
details leaked); the backend container health-checks itself with `curl` and the
frontend waits for it. TLS is terminated by a reverse proxy in front of the
loopback-bound frontend (Caddy one-liner in `DEPLOY.md`). Database backups are
`ops/backup-db.sh` (gzipped, timestamped, 14-deep retention, cron'd) with
`ops/restore-db.sh`. The unauthenticated demo seed (`/api/dev/seed`) is now
rate-limited and gated behind `petpattern.demo.enabled` so it can be removed in
prod. Full runbook: `DEPLOY.md`.

## Medications & treatments

A `Medication` (name, start date, optional end date — null means ongoing, notes)
is a passive record — never dosing advice or a treatment plan. It's owner-scoped
through `PetAccess` like everything else, and was added the Phase-2 way: a new
Flyway migration (`V2__medications.sql`), not a Hibernate auto-change. It surfaces
in the vet summary (a "Medications & treatments" section, also in the copyable
text) so meds sit next to food for the vet conversation, and is managed from a
`#medications` view reached contextually (from the vet summary and the check-in's
optional details) — not a primary nav tab. Medication start/finish also appear as
events in the "What changed before this?" pattern timeline (`MEDICATION_STARTED` /
`MEDICATION_ENDED`, ordered as causes right after food), so the story reads food +
meds + symptoms together — meds are part of the core aha moment, not a silo.

## Vet sharing (read-only link)

An owner can share a pet's vet summary with a vet who never logs in — the
distribution loop. `VetShare` holds an unguessable token (32 random bytes; only
the SHA-256 hash is stored, like sessions), a 90-day expiry, and is revocable;
one active link per pet. Link management at `/api/pets/{petId}/share` is
**primary-owner-only** (a caregiver revoking/rotating the link would kill the URL
the owner already handed to their vet; caregivers get 404 and the share card
hides for them) and never re-echoes the token after creation. The
public `GET /api/shared/vet-summary` requires no auth — the token travels in an
`X-Share-Token` header (deliberately NOT the URL path, so it never lands in nginx
or app logs), and it resolves the token to a pet and returns only the vet summary
(nothing else about the account), 404s on invalid/expired/revoked, and is
rate-limited per IP (one bucket for all token attempts). In the SPA, a
`#shared=<token>` hash renders a standalone read-only `SharedVetView` before the
login gate; it reuses the same `VetSheet` as the owner view (so they match) and
keeps the non-diagnostic disclaimer. Added via Flyway `V3__vet_shares.sql`.

## Dogs + cats (species-specific tracking)

PetPattern is a **dogs + cats** app for beta — deliberately not a generic all-pet
diary. Each species has its own tracking model and pattern language; no other
species are added until the dog/cat beta flow is validated.

`Pet.species` (`DOG` | `CAT`) drives everything. `DailyCheckIn` keeps the shared
signals (appetite, water, energy, vomiting, note) plus dog-only fields (itching,
stool, ear redness) **and** cat-only fields — `litterBoxUse`, `urinationChange`,
`straining`, `hidingBehavior`, `weightConcern`. The cat fields are nullable /
defaulted so existing dog check-ins are untouched; added via Flyway
`V5__cat_checkin_fields.sql` (`ddl-auto=validate`).

`PatternEngine.analyze` routes by species: cats go through `CatSymptomAnalyzer`
(appetite lower than usual, water change from normal, litter-box change, hiding
increased, vomiting logged more than once), dogs through the existing analyzers.
`PatternType` gained the five cat types; every exhaustive switch on it
(`InsightService`, `VetSummaryService`, `PatternTimelineService`) was extended.
Cat pattern copy is deliberately cautious and **non-diagnostic** — it never names
a disease (no urinary-blockage / kidney implications), and carries "This is not a
diagnosis, but it may be worth discussing with your vet."

Frontend: a `PetOnboarding` flow ("Who are we tracking?" → Dog/Cat → species copy
→ profile → "{name}'s memory is ready" → Log today), reused for the first pet and
for a "+ Add pet" tab in the switcher. `CheckInView` renders species-appropriate
fields (dog: scratching/stool/ear redness; cat: litter box/hiding/straining/
weight + urination), Today shows species signals, and `emptyCheckInFor(species)`
seeds a check-in with only that species' fields so signals never cross over.

The vet summary is species-aware too: cats get a dedicated "Litter box &
behavior" section (`VetSummaryDto.CatSignals` — litter-box change / not used /
urination change / straining / hiding more / weight concern + narrative) in both
the sheet and the copyable plain text, replacing the dog-only stool section;
`catSignals` is null for dogs, whose summary is unchanged.

## Multi-caregiver (invite / accept)

A pet keeps one **primary owner** (`Pet.owner`, the creator) and can gain any
number of **caregivers** — a partner, family member, or dog walker who can view
and log for the same dog. Access is consent-based: the owner sends an invite by
email (`PetInvite`, stored lowercased so someone can be invited before they even
have an account); the invitee sees it in their "inbox" and must **accept** before
they get access, at which point a `PetCaregiver` row is created. Nobody is added
silently.

`PetAccess` is the single choke-point, now with two levels: `requireOwnedPet`
returns the pet for the primary owner **or** any accepted caregiver (every
pet-scoped data endpoint — check-ins, food, patterns, meds, vet, photos, trials —
goes through it, so a caregiver co-manages the whole record), while
`requirePrimaryOwner` returns it only for the creator (managing the care circle:
invite / remove / cancel). Both 404 for missing / not-yours / not-shared, so
existence is never leaked, and reading the lazy `Pet.owner` proxy id needs no
open session. `CaregiverController` (`/api/pets/{petId}/caregivers…`, owner-only
except `DELETE /caregivers/me` for a caregiver to leave) and `InviteController`
(`/api/invites`, the invitee's accept/decline — only the email-matched invitee
may act, else 404) split the two sides. `PetController.listPets` returns owned
pets then pets shared-with-me, deduped. Invites expire after 14 days (scheduled
purge). Added via Flyway `V4__caregivers.sql` (`pet_caregivers`, `pet_invites`).

Frontend: an `InvitesBanner` surfaces pending invites both in the app shell and
on the first-run start screen (so a brand-new invitee with no pets of their own
can still accept); a `CaregiversView` (reached from a quiet "Share the care" line
on Today, keyed per pet) lets the owner invite by email and see/remove caregivers
and pending invites — caregivers who open it get a calm "only the owner manages
this" message. Copy stays human and non-SaaS; Croatian is natural and
gender-neutral.

## Photo diary (Sprint 15)

Photos give the record a visual, emotional dimension and a clinically useful
one (showing a vet how an ear or skin patch changed). `PetPhoto` stores the
image as a `bytea` column in the existing Postgres volume — no separate file
store, so it persists and re-seeds with everything else. Each photo has a body
area (ear/paw/skin/coat/eye/stool/other) and a captured date; the gallery
groups by area so the same spot lines up over time. `PhotoController` handles
multipart upload, a metadata-only list, a streaming image endpoint, and delete,
all scoped to the pet by an ownership filter.

Upload is hardened for a no-auth pilot: a raster-only content-type allowlist
(JPEG/PNG/WebP — SVG and HTML are rejected, closing the stored-XSS path),
`X-Content-Type-Options: nosniff` and a restrictive CSP on the image response,
a caption cap and a future-date clamp, and size limits at both nginx and Spring.
The client downsizes and re-encodes each image to JPEG before upload, so rows
stay small and the stored bytes are always a known-safe raster type. Photos also
surface as a strip on Bella today and inline on the timeline (once per day),
next to the food or signal change they sit beside.

## Food-elimination trial (Sprint 16)

The clearest way to tell if an ingredient is the problem is to remove it for a
few weeks and watch — so PetPattern guides that experiment. A `FoodTrial` records
the protein being removed, the window, and (optionally) a reintroduction date.
`FoodTrialService` reads the pet's existing check-ins and food logs and computes
a plain before / during / after comparison: average scratching and unstable-stool
days in the 14 days before, during the elimination window, and after the food
comes back. It also derives adherence — any food log containing that protein
started during the window counts as a slip — and writes a warm, NON-diagnostic
verdict ("scratching eased while chicken was out, and picked up again after it
came back — worth raising with your vet"). It states what the numbers did; it
never claims a cause or a cure. The protein is stored as a string to dodge a
brittle enum CHECK constraint. The trial surfaces as its own tab and as a strip
on Bella today.

## Recap & milestones (Sprint 17)

A periodic, personal look-back so the owner feels their effort added up.
`RecapService` reads the pet's existing data and, for the last N days, derives:
days logged, an itching trend versus the prior window of equal length (calmer /
itchier / about the same), the longest "calm stretch", counts of what the owner
did (food changes, photos added, trials run, patterns being watched), the
all-time logged-day total, a warm NON-diagnostic headline, and a short list of
milestones. It is deterministic and honest — no gamification, no fake hype. The
recap is reached from a card on Bella today (shown once there are at least a few
logged days), deliberately not given its own nav tab.

## AI Position

AI is not the product. The product value is structured longitudinal data and
deterministic pattern detection. The deterministic engine remains the source of
truth; AI only helps capture and organize input, and never replaces the stored
history or the rule-based engine.

The `com.petpattern.ai` package is a provider abstraction (Sprint 7 + Sprint 10):

- `AiProvider` is the seam. `MockAiProvider` (deterministic keyword reader) is
  the default and needs no setup; `AnthropicAiProvider` calls a hosted model
  (Haiku by default) over the Messages API using the JDK HTTP client — no extra
  dependency.
- `AiConfig` picks the provider from `petpattern.ai.provider` plus the presence
  of `ANTHROPIC_API_KEY`, and falls back to the mock otherwise.
- `AiExtractionService` runs the provider, attaches honest warnings, records a
  best-effort audit row, and never lets an AI failure crash the request.
- `POST /api/ai/parse-daily-note` returns suggested fields only; the frontend
  always shows a confirmation step, so nothing is saved without the owner. AI
  never produces a diagnosis.
