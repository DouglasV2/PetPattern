# PetPattern Tasks

## Sprint 1 - Bella Today Product Spine

- [x] Center the main product screen around "Bella today".
- [x] Show pet identity, current state, most important possible pattern, and next action in the first screen.
- [x] Add profile, today status, recent signals, current food, primary action, secondary action, and pattern teaser.
- [x] Add `/api/pets/{petId}/overview` with latest check-in, current food, and pattern candidates.

## Sprint 2 - Daily Check-In Flow

- [x] Add enum-backed daily check-in fields for stool, appetite, water, and energy.
- [x] Support `GET /api/pets/{petId}/check-ins`, `POST /api/pets/{petId}/check-ins`, and `GET /api/pets/{petId}/check-ins/latest`.
- [x] Keep legacy `/checkins` route working.
- [x] Build a quick tap "How was Bella today?" flow that returns to Bella today after save.

## Sprint 3 - Food And Trigger Tracking

- [x] Add food kind, date started, product name, primary protein, secondary proteins, grain-free, new food, and notes.
- [x] Support `GET /api/pets/{petId}/food-logs`, `POST /api/pets/{petId}/food-logs`, and `GET /api/pets/{petId}/food-logs/current`.
- [x] Build "What changed in Bella's food?" with protein and food-kind controls.
- [x] Surface the latest food event on Bella today.

## Sprint 4 - Pattern Engine V1

- [x] Add deterministic `com.petpattern.patterns` package.
- [x] Implement `PatternEngine`, `PatternCandidate`, `PatternType`, `PatternConfidence`, `BaselineCalculator`, `SymptomTrendAnalyzer`, `FoodExposureAnalyzer`, and `PatternExplanationBuilder`.
- [x] Implement itching above baseline, stool instability, water drop, and possible food trigger rules.
- [x] Support `GET /api/pets/{petId}/patterns`.
- [x] Show pattern cards and a pattern detail section in the frontend.

## Sprint 5 - What Changed Before This?

- [x] Add `PatternTimelineDto`, `PatternTimelineEventDto`, and `PatternTimelineService`.
- [x] Build a narrative timeline (change-point events, not a row-per-day table).
- [x] Support `GET /api/pets/{petId}/patterns/{patternId}/timeline` by stable id.
- [x] Add fallback `GET /api/pets/{petId}/patterns/timeline?type=POSSIBLE_FOOD_TRIGGER`.
- [x] Window logic per pattern type (food, itching, stool, water).
- [x] Add a "What changed?" detail view with the timeline, cautious summary, and owner-friendly explanation.
- [x] Wire "Show what changed" CTAs on Bella today and each pattern card.
- [x] Empty state copy when there is not enough history.

## Sprint 6 - Vet-Ready Summary

- [x] Add `VetSummaryDto` and `VetSummaryService`.
- [x] Support `GET /api/pets/{petId}/vet-summary` and `?days=30` (clamped 7-180).
- [x] Sections: pet, date range, owner-observed concern, check-in summary, food changes, stool changes, wellbeing, possible patterns, owner notes, disclaimer.
- [x] Server-built `plainText` for one-click copy.
- [x] Add a clean, printable vet summary view with "Copy summary" and "Print".
- [x] "Bring this to your vet" CTA from Bella today and the pattern detail.

## Sprint 7 - AI-Assisted Logging

- [x] Add `AiProvider` abstraction, deterministic `MockAiProvider`, and `AiExtractionService`.
- [x] Add `DailyNoteExtractionResult` and `AiParseAttempt` audit entity.
- [x] Support `POST /api/ai/parse-daily-note` returning structured field suggestions.
- [x] Never auto-save AI output; return a clear message and never crash when AI is unavailable.
- [x] Add "Write what happened" section with "Suggest fields" and a review-before-save confirmation step.
- [x] Offer to add a detected food change without leaving the owner's control.

## Sprint 8 - Pattern Memory & Feedback

- [x] Add `PatternObservation` entity + `PatternStatus` enum + repository, keyed by the engine's stable pattern id.
- [x] Add `PatternMemoryService`: records detections (once per calendar day), tracks recurrence count and first/last seen, persists owner status.
- [x] Enrich `PatternResponse` with status, detectionCount, firstDetectedAt, seenBefore.
- [x] `POST /api/pets/{petId}/patterns/{patternKey}/status` to set owner decision.
- [x] Dismissed patterns (RESOLVED / NOT_RELEVANT) demoted in the list and excluded from Bella today.
- [x] Frontend: "Seen N× since" memory line, status chip, owner actions, and a "Resolved & set aside" section.
- [x] Seed pattern history so the "remembers your dog" payoff (chicken seen 3×) is visible immediately.
- [x] Verified end to end: enrichment, status changes, dismissal filtering, count idempotency.

## Sprint 9 - Pattern Engine V2 (Route C)

- [x] Adaptive itching threshold per dog: `max(1.8, stdDev(baseline))` so steady dogs are more sensitive and noisy dogs avoid false alarms.
- [x] Add `BaselineCalculator.itchingStandardDeviation`.
- [x] New pattern type `RECURRING_EAR_REDNESS` with analyzer + explanation, wired into the engine and every exhaustive switch.
- [x] Auto-fade: remembered patterns the engine no longer detects show as "settled" for 30 days (`currentlyDetected=false`, `daysSinceLastSeen`), then drop off.
- [x] Frontend: three groups (active / settled / dismissed) with a settled card variant.
- [x] Store `PatternObservation.type` as a plain string so new pattern types never collide with a stale enum CHECK constraint under `ddl-auto`.
- [x] Seed a faded beef trigger so auto-fade is visible in the demo.
- [x] Verified: new type fires, settled shows and clears, status changes, timeline, all via nginx.
- [x] Review fix: adaptive itching threshold measures variability from calm days only (+ cap), so a flare-laden baseline can't desensitize the detector for recurring-itch dogs.

## Sprint 10 - Real AI Provider (Route C)

- [x] `AiProvider` abstraction now has a config-selected implementation: `AnthropicAiProvider` (hosted model over the Messages API) or the deterministic `MockAiProvider`.
- [x] `AiConfig` + `AiProperties`: provider chosen by `petpattern.ai.provider` and presence of an API key; defaults to mock so the app runs with zero setup.
- [x] `AnthropicAiProvider` uses the JDK HTTP client + Jackson (no new dependency), asks a cheap model (Haiku) for strict JSON, parses into `DailyNoteExtractionResult`, and never crashes the request (failures fall back to a safe empty suggestion).
- [x] `docker-compose` passes `ANTHROPIC_API_KEY` / `PETPATTERN_AI_PROVIDER` / `PETPATTERN_AI_MODEL` through (all optional).
- [x] Verified: default mock path unchanged; backend compiles with the hosted provider. (Live hosted call needs a real key, so it is not exercised here.)

## Sprint 11 - Retention Loop (Route B)

- [x] Server-computed retention signals in the overview (`RetentionSummary`): streak (consecutive days, "alive" only if last log is today/yesterday), loggedToday, daysSinceLastCheckIn, loggedDaysLast30.
- [x] Bella today: retention strip with a streak + 30-day coverage, and a calm nudge (positive when logged today, prompt + "Log today" when not).
- [x] Honest in-app daily reminder per pet: localStorage preference + browser Notification that fires while the app is open at the chosen time if today isn't logged. Clearly labeled; degrades gracefully without permission/support.
- [x] Lighter first-run: a 3-step "how it works" list on the start screen.
- [x] Verified: streak counts the full run (widened fetch window), overview returns the block, frontend builds, all via Docker.
- [x] Review fixes (6): clamp future-dated rows so `daysSince` can't go negative; pin server `TZ=UTC` to match the frontend's day; honest 400-day streak-cap comment; guard a cleared reminder time; construct the notification before marking the day done; distinguish "blocked" from "allow" in the reminder copy.

## Sprint 12 - Polish & Trust (Route D)

- [x] Delete check-ins and food logs: ownership-checked `DELETE` endpoints, with confirm-before-delete in the UI.
- [x] Edit a check-in: tapping a recent day prefills the form (the date-keyed upsert overwrites it).
- [x] Recent food changes list on the Food screen, each deletable.
- [x] Vet summary "Save as PDF" via the browser's native print-to-PDF, with a print stylesheet that shows only the summary and avoids breaking sections across pages.
- [x] Accessibility pass: `aria-pressed` on choice/toggle buttons, `aria-current` on the active nav tab, `role="alert"` on errors, `aria-label` on icon-only buttons, and a visible `:focus-visible` ring.
- [x] Verified: deletes return 204 and drop counts, bad id returns 404, frontend builds, all via Docker.

## Sprint 13 - Croatian Localization (Route D)

- [x] Lightweight i18n (`i18n.js`): the English string is its own key and default, so any unwrapped/untranslated string falls back to English (never broken). English stays the default locale.
- [x] Language toggle (EN / HR) in the header, persisted in localStorage and restored on load; live switch with no reload.
- [x] Croatian translations across the static frontend copy: nav, start screen, Bella today + retention, check-in (+ AI block), food, patterns, timeline, vet summary, common buttons/labels (~150 strings).
- [x] Verified at runtime (preview + DOM eval): toggling to HR renders Croatian live and persists; toggling back to EN restores English; brand phrases translate in HR while EN keeps them.
- [x] Documented boundary: backend-generated content (pattern titles/summaries/evidence, timeline events, vet-summary narratives, AI warnings) is produced server-side in English — localizing it is Sprint 14.

## Sprint 14 - Daily-Loop Hooks (Engagement)

- [x] One-tap "Same as yesterday" quick log on Bella today (clones the steady signals, resets acute flags) — removes the main reason people stop logging.
- [x] "It worked" payoff: overview `goodNews` line appears only when itching or stool genuinely eased after a recent rough patch (no fake wins).
- [x] Anticipatory `watchOut`: a gentle heads-up after a new food/treat started in the last few days ("worth keeping an eye on stool and scratching this week").
- [x] Human, non-AI copy throughout (warm, specific, understated); new UI stays in the existing calm teal/cream palette — no robotic phrasing, no generic-SaaS look.
- [x] Demo seed includes a recent chicken treat so the heads-up is visible.
- [x] Verified: `watchOut` fires with the right copy and renders live; `goodNews` correctly absent mid-flare; quick-log + delete confirmed (production DELETE 204 with the real origin; 403 only from the dev-proxy port).
- [x] Adversarial review (backend-logic + a dedicated "does any copy/UI read AI-generated?" lens): 18 confirmed findings all fixed — removed the Sparkles "AI feature" icon, app self-narration, owner-facing jargon ("baseline"/"exposure windows"/"deterministic… threshold"), in-body disclaimers, chirpy streak filler; fixed a good-news false-positive (missing stool data ≠ settled); polished Croatian (no "{name}inu" suffixes, no gendered UI verbs); consistent ellipses.

## Sprint 15 - Photo Diary

- [x] `PetPhoto` entity (bytea in the existing Postgres volume — no new file store), `PhotoArea` enum (ear/paw/skin/coat/eye/stool/other), `PetPhotoRepository`.
- [x] `PhotoController`: multipart upload, list (metadata only, no bytes), stream image, delete — all scoped to the pet with an ownership filter.
- [x] Upload hardening: raster-only content-type allowlist (JPEG/PNG/WebP — SVG rejected), `nosniff` + restrictive CSP on the image response, caption length cap, future-date clamp; multipart caps in `application.yml` and `client_max_body_size` raised in nginx.
- [x] Client resizes/re-encodes to JPEG before upload (small rows, known-safe type).
- [x] Frontend: a Photos tab + `PhotosView` (area picker, date, caption, gallery grouped by area to show progression, click-to-enlarge lightbox, delete), a recent-photos strip on Bella today, and inline thumbnails on the timeline (shown once per day).
- [x] Seed ships NO photos on purpose: this is a real-photo feature, and synthetic placeholder images read as fake/AI (would break the no-AI-look rule). The gallery shows an honest empty state until the owner adds real photos.
- [x] EN + Croatian copy; warm flat palette kept (no AI/gallery-SaaS look).
- [x] Adversarial review (backend logic + upload security + no-AI-voice): 5 confirmed, all fixed — list endpoint now uses a metadata-only projection (never loads the bytea on the gallery path); a per-pet photo cap guards the no-auth upload endpoint; the synthetic seed images were removed; two Croatian issues fixed (name-suffix contractions like `{name}inoj` → `za {name}`, and masculine-gendered verbs → neutral phrasing).
- [x] Verified: upload (incl. ~1.5MB via nginx → 201), 415 for non-raster (incl. SVG/XSS vector), 400 for missing file, image renders (fixed a CSP `sandbox` token that had blocked `<img>`), cross-pet isolation 404, delete 204, projection list returns metadata, gallery/strip/timeline thumbnails render with uploaded photos, empty state + Croatian verified live.

## Sprint 16 - Food-Elimination Trial

- [x] `FoodTrial` entity (protein stored as a String to avoid a brittle enum CHECK), `TrialStatus` (active/reintroduced/completed/abandoned), `FoodTrialRepository`.
- [x] `FoodTrialService`: computes a before / during / after comparison (avg itching + unstable-stool days per window) plus adherence (food logs with that protein started during the elimination window = slips), a human NON-diagnostic verdict, and phase/day math.
- [x] `FoodTrialController`: create (pick protein + length in weeks), list, reintroduce, complete, abandon, delete — all scoped to the pet; a cap on simultaneous open trials.
- [x] Frontend: a Food trial tab + `TrialsView` (start form, in-progress progress bar, before/during/after stat trio, verdict, adherence, actions) and a `TrialStrip` on Bella today.
- [x] Demo seed: one completed chicken trial that matches Bella's real logged data — calm while chicken was out (4.9 → 2.4), flare again after reintroduction (5.5). Honest, data-consistent.
- [x] EN + Croatian; warm flat palette (the before/during/after trio uses the existing sage/gold tones, not a SaaS chart).
- [x] Verified: full lifecycle (create/reintroduce/complete/abandon/delete), 400 on blank protein, cross-pet isolation 404, computed windows correct, UI + Today strip + Croatian render live.

## Sprint 17 - Recap & Milestones

- [x] `RecapService` + `GET /api/pets/{petId}/recap?days=30`: from the pet's own data — days logged, an itching trend vs the prior window of equal length, the longest "calm stretch", counts (food changes / photos / trials / active patterns), total logged days, a warm NON-diagnostic headline, and milestones.
- [x] `RecapResponse` DTO; added `countByPet` / `findFirstByPetOrderByCheckInDateAsc` and a photo count-by-date repository method.
- [x] Frontend: a `RecapView` (#recap) with a stat grid, the trend sentence, milestones, and a "what you did" line; a `RecapCard` on Bella today (gated on ≥5 logged days) that links to it. No new nav tab on purpose (would be the 8th).
- [x] Honest, reflective copy — no gamification/trophies, no fake hype; milestones are calm checkmarks. EN + Croatian.
- [x] Verified live: recap computes correctly for Bella (recent 4.7 vs prior 2.4 → "itchier"; calmest stretch 15; milestones derived), Today card + full view + Croatian all render.

## Core Beta Simplification (Progressive Disclosure)

The advanced features (photo diary, food trial, recap, AI-assisted logging,
pattern memory) are useful and stay — but a first-time user must NOT feel they
have to track everything. Simple daily habit first; advanced tools appear only
when relevant. The whole product reads as: log how Bella is today → track food
changes when they happen → PetPattern notices patterns → bring a clean summary
to the vet. Core daily habit is a ~20-second check-in.

- [x] Primary nav reduced to five core items: Today, Log, Food, Patterns, Vet.
- [x] Photos, Food trial, Recap, AI removed from primary nav (still fully available, contextually):
  - Photos → "Add a photo if it helps" inside Log (Optional details); thumbnails still shown on the timeline.
  - Food trial → "Track a careful food trial" inside Food, and inside a food-trigger pattern's detail.
  - Recap → "See your last 30 days" inside Patterns.
  - AI-assisted note → inside Log's Optional details ("Write naturally — PetPattern can suggest fields, but you stay in control").
- [x] Today ("Bella today") is the calm emotional home: status + moments + one clear action; removed the strips and the pet-profile panel; grid is Recent signals + Current food + Possible pattern; Recent notes below.
- [x] Log reduces form anxiety: "Only log what you noticed. A quick check-in is enough." + grouped sections How was Bella? / Anything unusual? / a collapsed Optional details (appetite, water, note, photo).
- [x] Pattern detail leads with "What changed before this?" (the aha moment); vet CTA present.
- [x] Vet summary reachable from Today, Patterns, and pattern detail ("Bring this to your vet").
- [x] No diagnosis/treatment language; medical-safety phrasing kept ("symptoms increased after… not a diagnosis… worth discussing with your vet").
- [x] EN + Croatian for all new copy; warm flat palette kept; frontend build + Docker Compose pass.

## Vet Sharing (read-only link)

The growth loop: an owner shares a link, the vet sees the value.

- [x] `VetShare` entity + `VetShareRepository`; added via Flyway **`V3__vet_shares.sql`**. Token = 32 random bytes (base64url); only its SHA-256 hash is stored; 90-day expiry; one active link per pet (create replaces the old); `@Scheduled` purge of expired.
- [x] Owner endpoints `/api/pets/{petId}/share` (GET status / POST create / DELETE revoke) — owner-scoped via `PetAccess`. Status never re-echoes the token (regenerate to get a fresh link).
- [x] **Public** `GET /api/shared/vet-summary/{token}` — no auth (the point), returns only the vet summary; invalid/expired/revoked → 404. Rate-limited (per-IP, one bucket for all token attempts, 60/min).
- [x] Frontend: a "Share with your vet" card in the vet summary (create → shows the copyable link once, regenerate, turn off); a standalone read-only `SharedVetView` the vet opens at `#shared=<token>` — rendered before the login gate, no nav/back, carries the non-diagnostic disclaimer. `VetSheet` extracted so owner + shared views stay identical.
- [x] Purely read-only; exposes nothing but the vet summary (no account, no photos). EN + Croatian.
- [x] Verified live: create/status/revoke, public open without cookie, invalid + revoked → 404, cross-owner create → 404, V3 applies, share card + shared page + Croatian render.
- [x] Security review (3 fixed / noted): token moved OUT of the URL into an `X-Share-Token` header so it never lands in nginx/app logs; `VetShareCard` keyed per pet so a link never leaks across pet switches. Known-minor (accepted for the single-instance pilot): no DB unique on `pet_id`, so a simultaneous double-"create" could briefly leave two valid links (same owner, same pet; revoke kills all).

## Multi-caregiver (invite / accept)

Two people, one dog — the network-stickiness feature, now possible on Route A.

- [x] `PetCaregiver` (pet ↔ caregiver owner, unique per pair) + `PetInvite` (pending, by lowercased email, 14-day expiry) entities + repositories; added via Flyway **`V4__caregivers.sql`**.
- [x] Access model in `PetAccess`: `requireOwnedPet` = primary owner **or** accepted caregiver (all data endpoints); `requirePrimaryOwner` = creator only (managing the circle). Both 404 for missing/not-yours/not-shared (no existence leak).
- [x] `CaregiverService` — invite (rejects self / already-caregiver / already-invited), remove, cancel, **leave** (caregiver self-service), and consent-based **accept/decline** where only the email-matched invitee may act (else 404, no id-guessing). Idempotent accept; `@Scheduled` purge of expired invites.
- [x] `CaregiverController` (`/api/pets/{petId}/caregivers…`, owner-only except `DELETE /caregivers/me`) + `InviteController` (`/api/invites` — my pending, accept, decline). `PetController.listPets` returns owned then shared-with-me, deduped.
- [x] Frontend: `InvitesBanner` (in the app shell **and** on the first-run start screen, so a brand-new invitee with no pets can accept); `CaregiversView` (invite by email, list caregivers + pending, remove/cancel), reached from a quiet "Share the care" line on Today; caregivers who open it get a calm owner-only message. EN + natural, gender-neutral Croatian.
- [x] Seed: one pending invite (`partner@petpattern.app`) so the owner's care screen shows a real state.
- [x] Verified live end-to-end (curl + preview): invite validations (self 400 / dup 409), invitee inbox, access before/after accept (404→200), caregiver can log and both see it, owner-only management (caregiver 404 on manage), outsider blocked (404), remove + leave revoke access, Join flow from the start screen, V4 applies, EN + HR render.

## Dogs + Cats beta cut (species-specific)

Expanded from dog-only to **dogs + cats** with species-specific tracking — a beta production step, not a generic all-pet app.

- [x] Species model: `Pet.species` (DOG | CAT). `DailyCheckIn` gains cat fields (`litterBoxUse`, `urinationChange`, `straining`, `hidingBehavior`, `weightConcern`) + enums; nullable/defaulted so dog check-ins are untouched. Flyway **`V5__cat_checkin_fields.sql`** (validate passes; verified columns present).
- [x] Check-in DTOs + controller carry cat fields (resolve to UNKNOWN when null).
- [x] Species-specific patterns: `PatternType` + `CatSymptomAnalyzer` (appetite lower, water change, litter-box change, hiding increased, repeated vomiting); `PatternEngine` routes by species; cautious, **non-diagnostic** cat wording (no blockage/kidney implications; "not a diagnosis, worth discussing with your vet"). Extended every exhaustive `PatternType` switch.
- [x] Onboarding: `PetOnboarding` — "Who are we tracking?" → Dog/Cat → species copy → profile → "{name}'s memory is ready" → Log today. Reused for the first pet and a **"+ Add pet"** tab.
- [x] Species-specific `CheckInView` (dog: scratching/stool/ear redness; cat: litter box/appetite/energy + hiding/straining/vomiting/weight toggles + urination/water) and species-appropriate Today signals. `emptyCheckInFor(species)` so signals never cross over; edit + quick-log are species-aware.
- [x] EN + natural, gender-neutral Croatian for all new strings. AI "Suggest fields" stays dog-only (it maps dog fields).
- [x] Verified: Bella (dog) demo + patterns unchanged; a created cat with cat check-ins yields cat patterns (HIDING_INCREASED, APPETITE_LOW, LITTER_BOX_CHANGE, REPEATED_VOMITING) with cautious wording; dog + cat onboarding/check-in/Today all render correctly; frontend + Docker build pass; V5 applies.
- [x] Adversarial review (3 lenses) — 5 findings, all fixed: gendered-feminine Croatian in the cat note example → gender-neutral present tense (EN source neutralized too); cat acute same-day signals (straining / hiding-more / litter-box "none" / weight concern / appetite refused) now raise the Today status to "watch"; cat litter-box rule no longer fires HIGH on a single benign "not used" day (needs repeat or straining); the dog-only "Stool changes" block is hidden from a cat's vet summary (UI + copyable text) — cats surface via patterns + wellbeing. Verified each live.
- [x] Cat vet-summary section: cats now get a "Litter box & behavior" block (litter-box change / not used / urination change / straining / hiding more / weight concern, with a plain narrative) in the vet sheet AND the copyable plain text — replacing the dog stool section for cats. `VetSummaryDto.CatSignals` (null for dogs, so the dog summary is byte-identical). Verified live: cat shows counts + narrative in EN and HR (labels), dog regression clean (catSignals null, stool block intact).

## QA sweep (pre-beta)

Full-app QA: 6 scripted user journeys against the live stack (new dog owner, new cat owner, edge-cases/validation, auth/session lifecycle, caregivers, demo+AI) with every reported issue independently reproduced before acceptance, plus a manual UI pass (onboarding forms, empty states, mobile 375px, console). ~76 checks passed (auth isolation, IDOR 404s, enum/range validation, XSS stored inert, rate-limit clamps, caregiver consent flows, demo integrity, AI-parse mock, retention math).

Confirmed and fixed:

- [x] **HIGH** — check-in note > 1200 chars hit the DB and returned a 500 that leaked the full SQL insert (table/column names). Now `@Size(max=1200)` → clean 400. Same guard added to food-log brand/product/notes, pet name/breed, and register displayName (medications/trials already clamped).
- [x] **MEDIUM** — server-UTC future-date check rejected "today" for users east of UTC right after their midnight. Check-ins now tolerate +1 day (2+ days ahead still 400). Full per-user timezone stays a real-beta item.
- [x] **LOW** — negative/absurd pet weight was accepted (`currentWeightKg: -5` → 201). Now `@Positive` + max 999.99 → 400.
- [x] **LOW** — recap itching `delta` had an inverted sign (prior−recent) so API readers saw "-2.3" next to "itchier". Flipped to recent−prior; labels adjusted (frontend never rendered the raw delta, so no UI change).
- [x] **LOW** — a caregiver could revoke/rotate the owner's active vet share link (destructive on someone else's artifact). Share management (status/create/revoke) is now primary-owner-only, matching the care-circle rule; the share card simply hides for caregivers. The public link itself is unchanged.
- [x] UI pass fixes: auth screen still said "for dogs" (→ dogs and cats, EN+HR); vet summary fabricated "Adult" for pets with no birth date (→ age omitted when unknown). Mobile 375px has no horizontal overflow; console clean; empty states (fresh pet, no patterns, empty vet range) read calm and honest.

## Production readiness (beta deploy prep)

Moving from local-only to a real beta candidate — deploy + trust + visibility, no new features.

- [x] **Health**: Spring Actuator `/actuator/health` (+ liveness/readiness probes, `show-details: never`); backend container healthcheck (curl) + frontend waits for healthy.
- [x] **Structured logs**: `logback-spring.xml` — readable console in dev, **JSON** in the `prod` profile (logback built-in encoder, no new dependency).
- [x] **Prod profile** (`application-prod.yml`): HTTPS-only session cookie, no SQL formatting. All secrets already env-driven (datasource/AI/CORS/cookie).
- [x] **Prod stack** (`docker-compose.prod.yml`): `SPRING_PROFILES_ACTIVE=prod`, secrets from gitignored `.env` (`.env.example`, required vars fail fast), Postgres not published, `restart: unless-stopped`, health-gated ordering.
- [x] **Dev-seed hardening**: `/api/dev/seed` gated behind `petpattern.demo.enabled` (404 when off) and added to the rate limiter (5/min/IP) — no longer an unauthenticated DoS in prod.
- [x] **Backups**: `ops/backup-db.sh` (gzipped, timestamped, 14-deep retention, cron example) + `ops/restore-db.sh`; `backups/` gitignored.
- [x] **Runbook**: `DEPLOY.md` (server setup, first deploy, TLS via Caddy, backups/restore, health/logs, upgrades/rollback, security checklist).
- [x] Verified: dev stack still builds + runs unchanged; `/actuator/health` → UP; demo seed still works and 429s past the cap; `docker-compose.prod.yml` parses.
- [ ] Needs the operator (external): a host + domain + DNS, a TLS reverse proxy, off-host backup copy, and an email provider for password reset.

## Trust & privacy (GDPR minimum, beta blocker)

Data trust before real users — no new product features.

- [x] **Terms acceptance**: `Owner.acceptedTermsAt/acceptedPrivacyAt/acceptedMedicalDisclaimerAt` (Flyway **`V6`**, nullable); `RegisterRequest.acceptedTerms` required and enforced in `AuthService.register` (400 otherwise), stamped on all three; demo `ensureOwner` stamps them too.
- [x] **Delete account** — `DELETE /api/account` (auth): hard-deletes every owned pet + all its data (check-ins, food, patterns, photos, trials, meds, vet shares, invites, caregiver links), the owner's caregiver associations on others' pets (association only), invites to their email, sessions, then the account; clears the cookie. Caregiver-only pets are never touched.
- [x] **Export data** — `GET /api/account/export` (auth): JSON of the account + owned pets in full (photo *metadata* only, share expiry not token) + minimal caregiver-only associations; downloaded as `petpattern-export.json`. Scoped to the current user.
- [x] **Legal**: Privacy / Terms / Medical Disclaimer (bilingual `legal.js`) at `#privacy`/`#terms`/`#disclaimer`, reachable before login; cautious language ("possible pattern", "worth discussing with your vet", "not a diagnosis", "based on owner-reported logs").
- [x] **Frontend**: required acceptance checkbox on register (gates submit) + legal footer; account/settings screen (top bar, not nav) with Export + Delete; EN + natural HR.
- [x] **Tests**: `AuthServiceTest` (register requires acceptance + stamps), `AccountServiceTest` (owned data wiped, others untouched, account removed).
- [x] Verified live: V6 applied (6 migrations); register 400 without / 201 with acceptance; export 401 unauth, scoped (P1 export has no other owner's pet; caregiver export shows only a minimal shared association); delete 401 unauth / 204 + login gone; caregiver account-delete leaves the owner's pet + data intact; register checkbox gates submit; legal pages render logged-out; export downloads; delete drops to sign-in; health UP; dev stack unchanged (ports 7317/8317/15437).
- [ ] Out of scope (needs email provider): password reset. Prod stack untouched.

## Backend HR i18n + medical-safety copy pass (beta trust)

HR beta must not look half-translated; medical-adjacent text must be consistently cautious.

- [x] **Locale plumbing**: `api.js` sends `Accept-Language` from the UI language (incl. photo upload); Spring's built-in resolver fills `LocaleContextHolder`; static `i18n/Copy.t` — English-string-as-key + one HR map (same philosophy as frontend i18n), `{0}` placeholders (no MessageFormat apostrophe pitfalls), HR pluralization (`days`/`years`), localized protein names, locale-aware dates (recap months, trial dates, frontend `formatDate`).
- [x] **Converted every backend narrative surface**: pattern cards (5 dog + 5 cat: title/summary/evidence), timeline (title/subtitle/owner explanations/all event copy/disclaimer/empty), vet summary (all narratives, mainConcern, plain-text section headers, sex/species/age labels, disclaimer), recap (headline + milestones), Today (explanation, nextAction, goodNews, watchOut), food-trial verdict/phase, insights, AI-reader warnings, common auth/validation errors. ~150 HR strings.
- [x] **Croatian style rules held**: no declined pet names (HR templates drop `{0}` and restructure where needed), no gendered participles, "mogući obrazac / vrijedi pratiti / vrijedi spomenuti veterinaru / zabilježeno je / nije dijagnoza" idiom.
- [x] **Species-specific HR**: dog copy (češanje/stolica/uši/poslastice), cat copy (pijesak/mokrenje/napinjanje/skrivanje/težina); `watchOut` nudge is species-aware in both languages (dog: stool/scratching; cat: appetite/litter/energy).
- [x] **EN safety pass**: "flare-ups"→"were logged after…", "symptoms picked up"→"more scratching or stool changes were logged", seeded demo copy softened (chicken/beef observations, ear-drops note), jargon "no deterministic threshold crossed"→"nothing outside the usual range yet".
- [x] **Missed frontend strings** wrapped in t(): Today status chip + headline, signal labels (stool/level/litter), protein & food-kind labels; dead `ageLabel`/'flare-up' key removed.
- [x] Verified live (curl + UI, `Accept-Language: hr`): dog flow (patterns/Today/watchOut/vet incl. plaintext headers/timeline/recap/trial verdict) fully HR; cat flow (4 cat patterns, catSignals narrative, PIJESAK section) fully HR; empty state HR; **EN regression clean** (no header → English everywhere); health/account/export/share intact; Croatian dates ("30. lip", "svibnja 2026").
- [x] **Adversarial review (3 lenses: HR naturalness, medical safety, key-mismatch correctness) — 21 confirmed → 12 distinct fixes, all applied + verified live**: public share link lost `Accept-Language` (options-spread clobbered headers — fixed, shared vet summary now localizes); dog note example used feminine participles (→ genderless present); Croatian number agreement (`Copy.days` now "21 dan"; day/week templates made agreement-safe: ordinal "…{n}. dan zaredom", "{n} tj.", label forms); verdict copy softened in both languages ("picked up"→"was logged higher", causal rule-outs → "worth mentioning to your vet"); "okidač/trigger" copy → "ne odgovara / doesn't sit well"; backend↔frontend terminology unified (Naprezanje, Zabrinutost za težinu); missing FoodKind labels (Dodatak/Ostalo); watchOut restructured ("Nove poslastice (piletina) od jučer — …"); masculine "Nov ovdje?" → "Prvi put ovdje?". Accepted as-is: "Medications & treatments" (descriptive of what the owner records, not advice).
- Known debt: owner-entered text stays as written (correct); settled pattern cards keep the language they were last detected in; less-common error messages still EN.

## Release candidate v0.1.0-beta (QA + deploy rehearsal)

Hardening only — no new features. Full audit + drills before inviting beta users.

- [x] **RC audit** (5-lens workflow, 10 confirmed): **2 blockers fixed** — (1) `ops/restore-db.sh` never actually overwrote (plain `pg_dump` + `psql` without ON_ERROR_STOP → silent no-op restore into an existing DB): now `pg_dump --clean --if-exists` + `psql -v ON_ERROR_STOP=1 --single-transaction`; (2) account deletion left the owner's raw notes in `ai_parse_attempts` (petId, no FK): now erased in `AccountService` (+ repo `deleteByPetId`, test). **3 risks fixed** — frontend Docker now `npm ci` with the lockfile (reproducible); CORS origins env-placeholdered in `application.yml`; `CorsConfig` strips a trailing slash and lists concrete allowed headers. **Nits**: DEPLOY.md V5→"all V*"; `include-stacktrace: never` pinned for prod (kept `include-message: always` so 4xx reason phrases still reach the UI — global-500-handler is documented future work). Left as-is (documented): dev-compose has no healthcheck (prod does); export includes caregiver emails (owner's own care-circle record).
- [x] **Fresh-install test** (clean volumes → up): Flyway V1–V6 apply from zero as SQL (15 tables); register (terms enforced) → dog + cat → check-ins → dog patterns (ITCHING_ABOVE_BASELINE, STOOL_INSTABILITY) + cat patterns (APPETITE_LOW, HIDING_INCREASED, REPEATED_VOMITING, LITTER_BOX_CHANGE) → timeline → vet summary (dog stool / cat litter) EN+HR → export (scoped) → delete (all data gone). PASS.
- [x] **Backup/restore drill** (real): register U1+pet+check-ins+AI-note → `backup-db.sh` (dump has 52 DROP stmts) → register U2 → stop backend → `restore-db.sh` → start backend → **U1 login + pets + check-ins + patterns intact, U2 gone** (restore truly overwrote + reloaded). GDPR erasure re-verified: delete account drops `ai_parse_attempts` 1→0. PASS.
- [x] **Prod rehearsal** (isolated, dev stack untouched): required secrets fail-fast; `docker-compose.prod.yml` → prod profile, cookie-secure, CORS=PUBLIC_ORIGIN, no published Postgres/backend port, frontend on 127.0.0.1, restart policies; throwaway prod-profile boot → `/actuator/health` UP, `/actuator/env` + `/configprops` 404 (no leak), `Set-Cookie … Secure; HttpOnly; SameSite=Lax`, JSON logs. PASS.
- [x] Deliverables: `docs/beta-qa.md` (manual QA checklist), `RELEASE_NOTES.md` (v0.1.0-beta). **Verdict: PASS** for beta RC once committed/tagged + deployed per DEPLOY.md.
- [ ] Process (operator): the repo has uncommitted changes — commit + tag `v0.1.0-beta` before deploy.

## Demo Data

- [x] Seed Bella as an adult Labrador mix.
- [x] Seed 45 days of daily check-ins.
- [x] Seed repeated chicken exposure periods and one main food.
- [x] Make demo data produce useful deterministic pattern cards.
- [x] Recent chicken window produces a clean "What changed?" timeline and a useful 30-day vet summary.
- [x] Fix re-seed over an existing volume (flush deletes before inserts to avoid `uk_pet_checkin_date` collisions).

## Quality Checks

- [x] `npm install`
- [x] `npm run build`
- [x] Backend compiles via the Docker Maven build (local Maven is still not on PATH in this shell).
- [x] `docker compose up --build` and verified `/timeline`, `/vet-summary`, and `/ai/parse-daily-note` end to end.

## Roadmap (planned, in priority order)

### Route B - Retention loop

- [x] UI-level slice delivered in Sprint 11 (streak, coverage, nudge, in-app reminder, onboarding steps).
- [ ] (Needs Route A) true push / email reminders that work when the app is closed — requires accounts + email/push infra.

### Route D - Polish & trust

- [x] Edit and delete check-ins and food logs (Sprint 12).
- [x] PDF export of the vet summary (Sprint 12 — native Save as PDF + print stylesheet).
- [x] Accessibility pass: ARIA states, focus ring, labelled controls (Sprint 12).
- [x] Croatian localization — frontend i18n delivered in Sprint 13 (EN default + HR, live toggle, ~150 strings).

### Engagement / hooks (in priority order, from the owner's perspective)

- [x] Sprint 14 — Daily-loop hooks: one-tap quick log, "it worked" good-news, anticipatory watch-out.
- [x] Sprint 15 — Photo diary: attach a photo (ear/paw/skin/stool) on a date; gallery groups by body area to show progression over time; photos also appear inline on the timeline on their day, and as a strip on Bella today.
- [x] Sprint 16 — Guided food-elimination experiment: a multi-week "remove X, watch, reintroduce" arc with adherence tracking and a clear before/during/after result. The differentiator for food-sensitive dogs.
- [x] Sprint 17 — Monthly "Bella recap" + milestones: a periodic personal look-back (trend vs the month before, calmest stretch, what you did, milestones); accumulated-value moment.
- [ ] Sprint 18 — Backend content i18n: localize engine-generated strings (pattern explanations, timeline events, vet-summary narratives, AI warnings, today status) via an `Accept-Language` / pet locale, so HR is fully Croatian, not just the chrome.
- [x] Multi-caregiver: partner / dog-walker log the same dog (see below). Accountability + network stickiness.

Guardrail for all of the above: copy stays human and specific (never an AI-assistant voice), UI stays calm and editorial (never generic-SaaS / purple-gradient). No fake positivity, no nagging — engagement is earned through genuine value (reassurance, the dog actually improving).

## Route A: Production foundation (now in progress)

The app is developed enough for a real beta, so Route A is being built in phases.

### Phase 1 — Accounts & private per-owner data (DONE)

- [x] `Owner` + `AuthSession` entities; email + password with BCrypt (spring-security-crypto).
- [x] Server-side sessions in an HttpOnly, SameSite=Lax cookie (`pp_session`); the DB stores only the SHA-256 hash of the token; 30-day expiry; logout revokes.
- [x] `SessionAuthFilter` populates a per-request `OwnerContext`; `PetAccess` is the single choke-point — `currentOwner()` (401 if signed out) and `requireOwnedPet()` (404 for missing OR not-yours, so existence never leaks).
- [x] `Pet` gained a (nullable-in-DB) `owner` FK; list/create scoped to the owner; EVERY pet-scoped controller (Pet, CheckIn, FoodLog, FoodTrial, Photo, Recap, Pattern, Vet, AI) routes through `PetAccess` — no IDOR.
- [x] `/api/auth/register|login|logout|me`; the Bella demo became a demo account and "Load Bella demo" signs into it (one-click demo preserved).
- [x] Frontend: an `AuthScreen` gate (login / register / demo), `credentials` on all requests, a Sign-out button; a new owner sees only their own dogs.
- [x] Verified: unauthenticated → 401; cross-owner read of a pet → 404 (IDOR blocked); login/logout/wrong-password; demo login, register, logout all work in the UI.
- Note: kept `ddl-auto=update` here on purpose (Hibernate adds the new tables); cookie is not `Secure` on http localhost (set `Secure` in prod/https).

### Phase 2 — Data safety & confidence (DONE for migrations + tests)

- [x] **Flyway migrations**: `V1__baseline.sql` captures the full schema (10 tables, PKs/FKs/unique + enum checks); `ddl-auto` switched to `validate`; `baseline-on-migrate` so existing DBs baseline at V1 and fresh DBs run it. Verified on a wiped volume: Flyway applies V1 → Hibernate `validate` passes → app boots → seed + every endpoint works.
- [x] **Automated tests** run in the Docker build (`mvn package`, no `-DskipTests`): engine (`BaselineCalculatorTest`, `SymptomTrendAnalyzerTest`), auth (`AuthServiceTest` — hashing, wrong-password, session hash-and-expiry), trials (`FoodTrialServiceTest` — before/during/after + a regression test for the null-itching NPE).
- [x] Env-driven config for the prod-sensitive bits: `PETPATTERN_COOKIE_SECURE` (session cookie is `Secure` on https), CORS origins + AI key already env-driven.
- [x] Rate limiting: per-IP fixed-window limits on login (10/min), register (5/min), AI parse (30/min) → 429 (`RateLimitFilter`). In-memory (single-instance pilot).
- [x] Error visibility: `RequestLoggingFilter` logs every 5xx with method/path/status/duration (no response change).
- [ ] Fuller observability (error tracking e.g. Sentry, JSON structured logs) + per-profile config files — before GA.
- [ ] (Optional) MVC slice tests for controllers; recap-service test.

## Medications & Treatments (product)

- [x] `Medication` entity (name, start/end date — null end = ongoing, notes) + repository; **added via Flyway `V2__medications.sql`** (first migration on top of the baseline — the Phase-2 workflow in action; `validate` confirmed it matches the entity).
- [x] `MedicationController` (list/create/stop/delete) — every endpoint owner-scoped via `PetAccess` (no IDOR).
- [x] Surfaced in the **vet summary** (a "Medications & treatments" section + in the copyable plain text) — meds sit alongside food for the vet conversation.
- [x] Progressive disclosure: no primary nav tab — a `MedicationsView` reached from the vet summary ("Manage medications") and from the check-in's Optional details ("Add a medication or treatment").
- [x] Purely a passive record — no dosing advice, no treatment recommendations (non-diagnostic). EN + Croatian.
- [x] Seed: an ongoing skin supplement + a finished ear-drops course during the flare.
- [x] Verified: V2 applies on fresh + existing volumes, CRUD + ownership (blank name 400, delete 204), vet block + manage link + check-in entry + Croatian all render live.
- [x] **Woven into the "What changed before this?" timeline**: medication start/finish now appear as events in the pattern story (with a pill icon), alongside food and symptom changes — so meds are part of the core aha moment, not siloed. Owner-scoped (only the pet's own meds). Verified live: the ear-redness / chicken stories show "Started/Finished Otiderm ear drops" in date order.

## Launch readiness (post-beta → public launch prep) — DONE

Feature freeze held: no new health-tracking features, AI, dashboards, subscriptions, or nav items. Only the three infra pieces needed for a public launch, all optional + env-driven (silently off in dev).

### 1. Password reset (forgot / reset flow)
- [x] `PasswordResetToken` entity + `V7__password_reset_tokens.sql` (hash-only storage, `expires_at`, `used_at`; same approach as `auth_sessions`).
- [x] `PasswordResetService`: mint token (invalidating any prior), one-time redeem, session revocation on success; `POST /api/auth/forgot-password` (neutral "if an account exists…", never reveals existence) + `POST /api/auth/reset-password`. Rate-limited (forgot 5/min, reset 10/min).
- [x] `PasswordResetMailer`: env-driven email provider. `PETPATTERN_MAIL_ENABLED=false` (default) logs the link (dev); `true` + `SPRING_MAIL_*` sends via SMTP. HR/EN email + response copy.
- [x] Account deletion erases outstanding tokens (FK-safe) — extended `AccountService` + test.
- [x] Frontend: "Forgot your password?" on sign-in → email → neutral notice; `#reset=<token>` opens a pre-auth "Choose a new password" view (mismatch/length validation). HR + EN.
- [x] Verified live (API + browser): neutral unknown==known; reset works; new pass logs in / old pass 401; token reuse 400; expired token 400; session revoked after reset; HR neutral message.

### 2. Error tracking (Sentry-ready, env-driven)
- [x] Backend `sentry-spring-boot-starter-jakarta` — disabled unless `SENTRY_DSN` set; `send-default-pii=false`, `max-request-body-size=none` (no request bodies / notes in payloads).
- [x] Frontend `@sentry/react` gated on `VITE_SENTRY_DSN` (build-time); `beforeSend`/`beforeBreadcrumb` strip request data, user identity, and console breadcrumbs.
- [x] Verified: empty DSN → no init, **zero ingest requests**, no startup error (dev + isolated prod boot).
- [x] **Fix (blocker caught in prod boot):** `spring-boot-starter-mail` auto-registers a `MailHealthIndicator` that probed SMTP on every `/actuator/health` → prod health went **DOWN** (would block the health-gated startup). Disabled via `management.health.mail.enabled=false`. Re-verified: isolated prod-profile boot → health **UP** in ~8s.

### 3. Privacy-friendly product analytics
- [x] `frontend/src/analytics.js`: env-driven (`VITE_ANALYTICS_URL`), off in dev. Sends ONLY `{event, ts}` via `sendBeacon`; hard allow-list of 7 events (`registered`, `pet_created`, `checkin_created`, `pattern_viewed`, `vet_summary_viewed`, `export_clicked`, `account_deleted`). No pet names/notes/symptoms/emails/health content — ever.
- [x] Wired the 7 touchpoints in `App.jsx`. Verified: disabled in dev = **no beacon** in the network log; payload shape confirmed.

### Env + docs
- [x] `.env.example`, `docker-compose.prod.yml` (backend runtime env + frontend build args for the VITE_* vars), `application.yml` (sentry + mail + public-origin), `frontend/Dockerfile` (build ARGs), SMTP timeouts.
- [x] New `docs/observability.md` (all three integrations: env, on/off per env, event list, security/privacy decisions); updated `DEPLOY.md`, `RELEASE_NOTES.md`, `docs/beta-qa.md`, `api.http`.
- [x] Prod compose parses (`config` exit 0); dev stack unchanged on 7317/8317/15437 (health UP, frontend 200).

## Load test + DB optimization + cybersecurity assessment — DONE

Empirical 20-user load test + DB-optimization review + multi-agent security audit (8 dimensions, adversarially verified) + live probing. Full write-up: `docs/security-notes.md`.

### Load test (k6, 20 VUs / 45s, seeded 20 owners × pet × 30 check-ins)
- [x] **PASS: 0.00% errors, 282→368 req/s.** Hot path `/overview` p95 102ms cold → 19ms warm; patterns/vet ~15ms; check-ins 7ms. Pool never starved.

### DB optimization
- [x] `V8__fk_indexes.sql`: btree indexes on the FK columns filtered on hot paths (`pets.owner_id`, `food_logs.pet_id`, `pet_photos.pet_id`, `medications.pet_id`, `food_trials.pet_id`, `ai_parse_attempts.pet_id`, `pet_caregivers.caregiver_id`, `pet_invites.pet_id`). Confirmed the check-in queries already use `uk_pet_checkin_date` (EXPLAIN: Bitmap Index Scan).
- [x] Explicit Hikari pool: `maximum-pool-size: 20` (`DB_POOL_SIZE`), `minimum-idle: 5`, `connection-timeout: 10s` (was the default 10). Postgres max_connections=100 → safe headroom.

### Security fixes (audit: 22 findings, 10 CONFIRMED + 12 PLAUSIBLE, 0 refuted)
- [x] **HIGH** — reset link with raw token was logged in prod by default. Now: link logged **only when NOT the `prod` profile**; prod logs a no-token "mail not configured" notice. Mail send moved `@Async` after commit.
- [x] Med — HTTP security headers added in `nginx.conf` (X-Frame-Options DENY, nosniff, Referrer-Policy, HSTS, CSP with `frame-ancestors 'none'`). Verified: SPA has no inline scripts / eval / external resources → CSP safe; app loads.
- [x] Low — login timing enumeration closed (constant-work BCrypt vs dummy hash; verified unknown≈known ~0.066s). forgot-password timing closed (async mail). Reset token stripped from URL/history (`replaceState`, token held in App state — browser-verified the reset view survives the auth-check re-render). Register/reset `@Size` + `@Valid` (oversized email → 400, was 409). Photo upload magic-byte validation (text-as-PNG → 415). Backend container runs as non-root (`uid=100 app`).
- [x] Documented/accepted residuals (register enumeration inherent to signup, X-Real-IP prod-safe, unbounded pagination, pattern recompute, frontend nginx root, image digest pinning, esbuild dev-only advisory) — see `docs/security-notes.md`.
- [x] Access-control audit dimension returned **zero** findings (no IDOR); no SQLi (parameterized JPQL); no frontend XSS sinks.
- [x] Re-verified after fixes: full build + tests green, V8 applied (9 indexes), reset flow works, headers present, load test still 0 errors. Test data cleaned up (only `demo@petpattern.app` remains).

## Beta hardening — branch `feature/beta-hardening` (IN PROGRESS — HANDOFF for a new chat)

Continuation of the 6-phase "senior-engineer beta + mobile hardening" brief. Branch off `main@f3fcac4`, **not merged, not pushed, `main` untouched**. Requested order: **5 → 3 → 2 → 1 → 6 → 4**. DONE so far: audit, security preflight, Phase 5, Phase 3, Phase 2, **Phase 1**. **▶ NEXT: Phase 6** (analytics/retention), then Phase 4 (mobile/notifications), then the final Croatian production-readiness report.

### Environment & gotchas (READ FIRST)
- **No local Maven/Java** — backend builds/tests via Docker: `docker compose build backend` runs `mvn clean package` (full suite; a failing test fails the build). Fast single test: `docker run --rm -v "$(pwd)/backend:/app" -v maven-repo:/root/.m2 -w /app maven:3.9.9-eclipse-temurin-21 mvn -q test -Dtest=SomeTest` (Git Bash; prefix `MSYS_NO_PATHCONV=1` if the `-w` path mangles).
- **Frontend lockfile gotcha (this bit us):** Vitest devDeps were installed with local npm 11, which writes a `package-lock.json` the Docker image's npm 10.9.8 rejects under `npm ci` (prints usage, exit 1). Local `npm run build` masks it (reuses node_modules). If you change frontend deps, regenerate the lock with npm 10.9.8: `MSYS_NO_PATHCONV=1 docker run --rm -v "$(pwd)/frontend:/work" node:22-bookworm-slim bash -c 'mkdir /b && cp /work/package.json /work/package-lock.json /b && cd /b && npm install --no-audit --no-fund && npm ci --include=dev && cp /b/package-lock.json /work/package-lock.json'` then rebuild the frontend image.
- Frontend tests: `cd frontend && npm test` (Vitest, added in Phase 5; 57 tests now). Frontend build: `npm run build`.
- Full stack: `docker compose up -d --build`. Ports **127.0.0.1:7317 (frontend), :8317 (backend), :15437 (pg)** — use **127.0.0.1, NOT localhost** (localhost → IPv6 hang on this Windows box). Plain `docker compose up` serves a STALE frontend — always `--build`.
- **Authenticated E2E without a UI login:** `POST /api/dev/seed` sets a demo session cookie AND returns Bella's PetResponse (id). `curl -c jar -X POST http://127.0.0.1:8317/api/dev/seed`, then `curl -b jar …/api/pets/{id}/overview`. Add `-H "Accept-Language: hr"` for Croatian copy. Node is on PATH for JSON parsing.
- The in-app browser (mcp Claude_Browser) is flaky on this box (screenshots time out) — `get_page_text` + `read_page` + `javascript_tool` work; drive the demo by clicking "Try dog demo".
- A gitignored per-step ledger lives at `.superpowers/sdd/progress.md` (scratch).

### DONE (all committed on the branch)
- **Audit + baseline** — full audit; backend 73 tests green baseline.
- **Security preflight** (`5a94312`) — rate-limit `/api/dev/seed-cat` + `-rabbit` (were unlimited) + `RateLimitFilterTest`; `.gitignore` keystores/signing/Capacitor outputs; both `.dockerignore` tightened; `VITE_API_BASE` documented. ⚠️ **Bruno action:** rotate the Google OAuth client secret in `.env` if that file may have left the machine (gitignored, never in git history, but the folder name suggests a copy).
- **Phase 5 — split frontend monolith** (`fd47d73`,`f676842`,`dd495f8`,`25540a2`,`9586fdb`,`f9e43e4`,`6fa1b1a`) — `App.jsx` **5819→1207**; `styles.css` **4266→28 ordered partials** (CSS bundle byte-identical → zero visual change); new `src/lib/`(13), `src/components/`(13), `src/features/`(12 areas, 50 files); Vitest added. No behavior change.
- **Phase 3 — simplify Today** (`81a4749`) — primary action high → confirmation → progress → ONE insight (weekly→seen-before→note) → collapsible `<details>` "More about {name} today" holding the rest. Verified live. Nothing removed.
- **Phase 2 — first-week payoff** (`96f16ea`,`96310b0`,`42a6e38`) — honest milestones pinned to real engine gates (1→7 global→14 dog-trend→21+2-food dog-food-trigger; cats/starter terminal at 7): `MilestoneCalculator` (pure) + `PatternMemoryProgress` DTO (12th overview field) + `PatternMemoryProgress.jsx` + RetentionStrip de-dup + onboarding explainer. 57 FE tests + backend suite green. Adversarial honesty review: gamification/diagnosis LOW.
- **Phase 1 — species-specific pattern logic** — `SpeciesRuleSet` registry (Spring-collected `Map<Species,SpeciesRuleSet>`; a new species is one `@Component`, zero engine edits) replaces the dog/cat/starter if-else. `DogRuleSet`/`CatRuleSet` are byte-identical adapters over the existing analyzers (dog regression verified clean). The 8 starter species get data-grounded rules built ONLY from real `speciesProfiles.js` signals: rabbit/GP GI-stasis (URGENT) + intake/dental/behaviour; hamster wet-tail (URGENT) + lump/weight; bird breathing + sick-posture (URGENT) + feather/quiet; reptile feeding-refusal + thermal-context (INFO); turtle enclosure-context (INFO) + shell; fish spot-fin/swimming + water-context (INFO); other-small-pet + the preserved generic `REPEATED_OBSERVATION`. New orthogonal `Severity{INFO,WATCH,URGENT}` (URGENT only from a plain, countable **same-day co-occurrence pinned to the last 7 days** — never inference, never names a condition in owner copy) surfaced on `PatternResponse`, `InsightService` ("urgent"), the timeline (urgent banner + event tier), and a vet-summary "URGENT SIGNS NOTED" block. `PatternCandidate` gains `severity`+`urgentNote` via a 10-arg convenience ctor (all old call sites untouched, WATCH/null); severity leads the engine sort so an urgent sign is "the most important possible pattern". 4 switch `default` arms + urgent-window pinning (the 2 "important" review fixes). ~60 HR strings. **Design corrections forced by the code:** turtle collects no temperature/humidity → its context rule uses `water_enclosure`; rules match the exact option strings the real UI stores (verified `StarterGuidedFields.jsx`). Rabbit demo seed corrected to real option strings + memory re-keyed to `RABBIT_INTAKE_DROP` so the demo shows the urgent sign + the "seen 3×" payoff honestly. **Verified: backend 137 tests green, FE 57 green, live end-to-end (rabbit urgent path EN+HR, Today insight, timeline banner, vet URGENT block, dog regression clean).** No-AI-voice review applied 3 confirmed voice fixes; the full 5-lens adversarial pass was cut short by an API session limit and the remaining lenses (correctness/medical-safety/HR/backward-compat) were covered by direct self-review + the live checks. Files: +21 new backend classes + 7 new test files, ~15 touched (+ frontend TimelineView/VetSheet/checkins.css/hr.js).

### ✅ Phase 1 — deepen species-specific pattern logic (DONE — implemented per the approved design below)

Today only DOG/CAT have real rules; the 8 starter species share ONE generic "same signal changed ≥2 days" rule (`ObservationPatternAnalyzer`). Give each starter species meaningful rules built ONLY from data it actually collects (`observationsJson` guidedCategories in `frontend/src/speciesProfiles.js`) + an urgent-care severity tier. Medical-safety verified: diagnosis LOW, urgent-care honest (no fake triage, never names a condition in owner copy), data-grounded, saved `PatternObservation` ids stay compatible. Verdict: fix-then-ship.

**Architecture (no giant class):**
- Replace `PatternEngine`'s species `if/else` (PatternEngine.java:60-79) with a **`SpeciesRuleSet` registry**: `interface SpeciesRuleSet { Species species(); List<PatternCandidate> evaluate(RuleContext ctx); }`, `record RuleContext(Pet, List<DailyCheckIn>, List<FoodLog>)`. Engine ctor takes `List<SpeciesRuleSet>` → `Map<Species,SpeciesRuleSet>`; keeps the `<7`-checkin gate + confidence sort; dispatch = `map.getOrDefault(species, generic).evaluate(ctx)`. New species = one @Component, zero engine edits.
- `DogRuleSet`/`CatRuleSet` = thin adapters calling today's `SymptomTrendAnalyzer`/`FoodExposureAnalyzer`/`CatSymptomAnalyzer` **verbatim** → existing pattern_keys byte-identical, no migration.
- Starter species: each `<Species>RuleSet` = `List.of(StarterRule …)` in its OWN file, delegating to a shared `StarterRuleEngine.run(ctx, rules)`. `GenericStarterRuleSet` (fallback) wraps `ObservationPatternAnalyzer` for OTHER_SMALL_PET + unmapped, SKIPPING keys a specific rule already claims.
- `record StarterRule(String ruleId, PatternType type, RuleTag tag, Severity severity, int windowDays, int minHitDays, ToIntFunction<SignalWindow> hitDays, IntFunction<PatternConfidence> confidence, BiFunction<RuleFire,Pet,PatternCandidate> explain)`.
- Shared **`SignalWindow`** (built once per evaluate from `BaselineCalculator.recentDays` + `ObservationSignals.parse`; per-day signal index): `changedDays(key)`, `daysMatching(key,values)`, **`coOccurDays(predA,predB)`** (same-day cross-signal — the core new capability), `visibleChangeDays(area,statuses)`, `evidenceIds(...)`.
- Stable ids: `petId + ":" + ruleId` (ruleId a FROZEN constant; visible-change variants append `_<AREA>`). Never derive from dates/counts. New `PatternType` constants are additive (type is a plain string column).
- New **`Severity {INFO,WATCH,URGENT}`** (orthogonal to `PatternConfidence`). Extend `PatternCandidate` with trailing `Severity severity` + `String urgentNote`, **plus a convenience constructor preserving the exact current 10-arg signature** (defaults `WATCH`/null) so every existing call site compiles unchanged.

**Per-species rules** (id · from-real-signals · threshold · severity · owner copy is cautious/non-diagnostic):
- **RABBIT**: `RABBIT_GI_STASIS_RISK` (appetite_hay∈{Eating less,Refused food,Hay intake changed} AND poop∈{Less,Smaller,Softer,Noticed change} SAME day · ≥1 co-occur, MED/HIGH≥2 · **URGENT** · "You recorded {0} eating less and passing fewer, smaller, or changed droppings on the same day. In rabbits, eating less together with fewer droppings is a well-known warning sign. This is not a diagnosis and PetPattern cannot determine the cause." urgent-note: "…the kind of change many rabbit vets say not to wait on. PetPattern cannot examine {0} — if this is happening now, please contact your veterinarian promptly."); `RABBIT_INTAKE_DROP` (appetite changed alone · ≥2d/14d · WATCH); `RABBIT_DENTAL_INTAKE` (teeth∈{Chewing less,Drooling} · ≥2d or co-occur appetite · WATCH); `RABBIT_LOW_ENERGY_HIDING` (energy=Lower AND hiding=More same day · ≥2/5d · WATCH).
- **GUINEA_PIG**: `GUINEA_PIG_GI_STASIS_RISK` (appetite changed AND poop reduced/changed SAME day · ≥1 · **URGENT**); `GUINEA_PIG_WEIGHT_AND_INTAKE` (weight=Noticed change ≥2d/21d + appetite changed · WATCH); `GUINEA_PIG_DENTAL_INTAKE` (WATCH). **Data gap:** GP collects NO breathing signal → do NOT invent a GP breathing rule; adding a `breathing` guidedCategory to the GP profile is a product follow-up.
- **HAMSTER**: `HAMSTER_WET_TAIL_RISK` (droppings=Watery AND (activity=Less active OR appetite=Eating less) SAME day · ≥1 · **URGENT**); `HAMSTER_LUMP_SWELLING` (visible_change SWELLING / fur_skin=Change noticed · ≥1, HIGH if status worse later · WATCH); `HAMSTER_WEIGHT_LOSS` (weight=Noticed change ≥2d/21d · WATCH); `HAMSTER_LOW_ACTIVITY` (activity=Less/hiding=More ≥2d/7d · INFO, WATCH if co-occurs eating less).
- **BIRD**: `BIRD_LABORED_BREATHING` (breathing=Noticed change binary · ≥1 day, HIGH if repeats/co-occurs sitting-lower/less-active · **URGENT** — birds hide illness, respiratory signs late); `BIRD_SICK_POSTURE` (perch=Sitting lower AND (activity=Less active OR appetite=Eating less) SAME day · ≥1 · **URGENT**); `BIRD_FEATHER_PLUCKING` (feathers∈{Plucking,Change}/visible_change FEATHER · ≥2d/21d · WATCH); `BIRD_GONE_QUIET` (vocalization∈{Quieter,Different} ≥2d/7d · INFO, WATCH if co-occurs appetite/activity).
- **REPTILE / TURTLE**: `*_THERMAL_CONTEXT` (temp/humidity change within 3d of feeding-refusal/basking change · **POSSIBLE_CONTEXT · INFO, never urgent** — behaviour is environment-driven); `*_FEEDING_REFUSAL` (feeding∈{Ate less,Refused} ≥3d/21d · WATCH, never urgent — fasting/brumation normal); `*_BASKING_AVOIDANCE` (basking avoid + less active · WATCH); turtle adds `TURTLE_SHELL_CONCERN` (visible_change SHELL · WATCH).
- **FISH_AQUARIUM**: `FISH_WATER_QUALITY_CONTEXT` (water_change/clarity/temp around swimming/eating change · POSSIBLE_CONTEXT · INFO); `FISH_SPOT_FIN_WATCH` (spots_fins/visible_change FIN_SCALE ≥2d/14d · WATCH); `FISH_ABNORMAL_SWIMMING` (swimming∈{Unusual,Hiding,Less} ≥2d/7d · WATCH); `FISH_APPETITE_DROP` (feeding lower + recent water_change ≥2d/7d · INFO, WATCH if persists).
- **OTHER_SMALL_PET**: `REPEATED_OBSERVATION:<key>` (existing generic rule PRESERVED VERBATIM for id stability); `SMALL_PET_ANOREXIA_LETHARGY` (appetite∈{Eating less,Refused} AND activity=Less active SAME day ≥2/7d · WATCH — species unknown, not URGENT); `SMALL_PET_GI_CHANGE` (droppings∈{Watery,Changed,Less}+appetite ≥2d/7d · WATCH).

**Urgent-care tier:** `UrgentCopy.disclaimer(name)` = logged-facts + negate-inference + vet-handoff, in the `catBoundary()` sentence family; **NEVER names a condition** ("wet tail"/"GI stasis" live only in internal ruleIds). Only the explicit cross-signal/vital rules set URGENT (plain countable co-occurrence, never inference). Surface `severity`/`urgentNote` on `PatternResponse` DTO, `InsightService.severity()` ("urgent"), `PatternTimelineService` (urgent tier), a `VetSummary` "URGENT SIGNS NOTED" section (above the disclaimer), and a `sev-urgent` bordered banner (`TimelineView.jsx` + `checkins.css`). Additive to the existing "not a diagnosis" boundary; still behind the ≥7-checkin gate.

**4 fixes to apply (from the medical-safety review — approved):**
1. **(important)** New `PatternType` constants break 4 non-exhaustive backend `switch` expressions over `candidate.type()` → add `default` arms: `InsightService.severity` (InsightService.java:74), `VetSummaryService` (:461), `PatternTimelineService.windowFor` (:151) + `ownerExplanation` (:380). `severity()` keys off `candidate.severity()` first. + a compile regression test constructing each new type through those paths.
2. **(important)** Pin URGENT cross-signal rules to a SHORT recent window (~7 days) so "if this is happening now" is truthful (`analyze()` loads 120 days) + a test that an older co-occurrence does NOT raise URGENT.
3. **(minor — already folded in above)** RABBIT_GI_STASIS copy broadened to "fewer, smaller, or changed droppings" to match its trigger set.
4. **(minor)** Single-mistap escalation (lump/urgent at ≥1 day): keep the conditional "if it is growing / happening now" copy; a check-in chip confirm/undo is a follow-up (no threshold change).

**Test plan:** per-species RuleSet tests (below/at/above threshold; cross-signal fires ONLY same-day; URGENT⇒non-null urgentNote; context rules INFO/non-urgent; binary breathing single-day URGENT) + edge cases: `<7` gate blocks even urgent; detectionCount once/day; dismissed idempotent; 30-day fade + id stability on re-detect; env-change-preceding-symptom; no-false-pattern on sparse/normal-only; malformed/null JSON tolerance; no cross-pet leakage (petId-namespaced ids + own relatedCheckInIds); urgent invariants; backward-compat (existing suites pass via the convenience ctor) + fill the missing `CatSymptomAnalyzerTest`/`FoodExposureAnalyzerTest`; `PatternEngine` registry wiring. JUnit5 plain assertions, `new` + real collaborators, `observationsJson` fixture like `ObservationPatternAnalyzerTest`.

**Files:** ADD `SpeciesRuleSet, RuleContext, RuleTag, Severity, SignalWindow, StarterRule, StarterRuleEngine, {Dog,Cat,Rabbit,GuineaPig,Hamster,Bird,Reptile,Turtle,Fish,GenericStarter}RuleSet, UrgentCopy` + tests. TOUCH `PatternEngine` (registry), `PatternType` (+STARTER_URGENT_SIGN, STARTER_INTAKE_CHANGE, STARTER_OUTPUT_CHANGE, STARTER_BODY_CONDITION, STARTER_BEHAVIOR_CHANGE, STARTER_ENV_CONTEXT), `PatternCandidate` (2 fields + convenience ctor), `PatternResponse` DTO, `InsightService.severity`, `PatternTimelineService` (urgent tier + the 2 switch defaults), `VetSummaryService` (urgent section + switch default), `Copy.java` (urgent + per-species HR strings), frontend `TimelineView.jsx` + `checkins.css`. Do NOT edit `ObservationPatternAnalyzer` id logic or any existing analyzer method body.

### Then — Phase 6, Phase 4, Final report
- **Phase 6 — privacy-safe analytics + retention.** Current analytics is a 7-event `{event,ts}` allow-list, OFF by default, no backend store → **D1/D7/D30 unmeasurable**. Build an internal event model (pseudonymous ref, type, ts, categorical meta, schemaVersion, platform web/android/ios, appVersion), a backend store, funnel + retention reporting (queryable/admin-guarded), privacy filtering (no names/notes/symptoms/emails/health/raw ids to 3rd parties), duplicate-milestone prevention, timezone-safe D1/D7/D30, authz + tests. Update privacy-policy text to match.
- **Phase 4 — mobile + notifications.** Capacitor is deps-only (no `capacitor.config`, no `android`/`ios` projects, no plugins). Reminders are foreground-web-only (`ReminderControl` + Web Notification + setInterval + localStorage). Add `capacitor.config` (appId/appName/webDir), native local-notification foundation (opt-in, user time, timezone-safe, neutral non-medical text, no health details on lock screen, don't fire if disabled/logged/no-permission), `VITE_API_BASE` wiring for mobile builds, OAuth/deep-link handling (Google is web-redirect only; password-reset `#reset=` is a hash route — not a native deep link), permissions + safe-area + status bar, and mobile build docs. **Android/iOS builds are NOT verifiable in this environment** (no Android Studio/Xcode) — deliver config + docs + tested notification-scheduling logic, honestly marked implemented/generated/verified/not-verifiable.
- **Final** — full regression (backend suite + FE build + migrations-from-clean + upgrade-path) + the **Croatian production-readiness report** (16 sections + COMPLETE/PARTIAL/BLOCKED table + branch/commits/commands/manual-steps/env-vars). Do NOT mark COMPLETE unless implemented AND tested.

### Known follow-ups / minors (logged, not blockers)
- Day-count copy "1 days"/"1 dana" → singularize via the existing `Copy.days()` helper (weekly-insight support line).
- `frontend/src/locales/hr.js` duplicate keys `'Other'`/`'Remove'` (identical values, harmless).
- Activity `PATCH /activities/{id}` overwrites `notes` if omitted (no FE partial-PATCH uses it yet).
- Pre-existing (NOT from this work): `stoolLabel(c.stoolState)` arg-shape bug in `evidenceSignal`; dead exports `SPECIES`/`todayHeadline`/`petAgeLabel`.
