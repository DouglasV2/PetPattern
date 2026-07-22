# PetPattern differentiation, activation & trust pass — final report

Branch `release/hardening`. Seven commits on top of the prior hardening work
(nothing in the palette, typography, cards, sidebar, navigation, visual identity,
cautious tone, or Android release architecture was changed). The full pre-code
audit is in [differentiation-audit.md](differentiation-audit.md).

| Commit | Phase |
|---|---|
| `7dc157f` | Audit matrix (pre-code) |
| `204cfad` | A — honesty core (Parts 7, 9, 12) |
| `49d0fe8` | B — evidence stages + counter-evidence (Parts 8, 10, 11) |
| `1a3d52b` | C — persistent baseline + quick-log semantics (Parts 1, 2) |
| `df3c154` | D — day-one value + factual recap (Parts 4, 5) |
| `255fdb7` | E — timeline hierarchy + differentiated copy (Parts 6, 13, 14) |
| `9e706ae` | F — draft protection (Part 3) |

---

## 1. Audit matrix (summary)

Full per-capability matrix in [differentiation-audit.md](differentiation-audit.md). Headline:
the product was already ~70% to the thesis (cautious copy, Vet Summary ungated,
Recap + WeeklyInsight already exist, timeline exists, Android hardening intact, a
real two-way `FoodTrialService` verdict engine). The concentrated defects were:
`detectionCount`-as-recurrence; no evidence-stage model / no counter-evidence;
"current food" = most-recent-of-any-kind; a few causal strings; no draft
protection; ~26 of 32 required tests missing. **All addressed below**; a few
timeline items are deliberately deferred (section 11).

## 2. Previous vs new user journey

| Moment | Before | After |
|---|---|---|
| Onboarding | Baseline framing, but "few seconds" and "record for your vet" not explicit | All three benefits explicit on the done screen |
| Daily log | "Same as usual" = one tap, but framed as a "quiet day" even when the pet was still 8/10 | "No change since last check-in" (honest carry-forward) **and** a distinct one-tap "Back to usual" (baseline) |
| Current food | Newest food of any kind — a treat logged today replaced the main food | The active MAIN_FOOD period; treats/supplements never replace it |
| A possible pattern | Headline "Possible chicken-related pattern"; a one-sided "supports" list; limitations in muted footer; "Seen a few times" after 2 app-opens | "Chicken and later changes were logged close together"; a stage chip; supports **with the denominator**; a prominent "What this can't tell us yet"; "Noticed in more than one separate stretch" only for real separate periods |
| Weekly recap | Itching/dog-flavoured stats; could read "not enough data yet" | Species-neutral counts (check-ins / unchanged / changed / missing) + a vet-ready paragraph + a neutral suggestion, always |
| Vet summary | Change-history only (a stable diet looked like "no food") | Adds a **current main food** snapshot; no confidence leaks into the shared/exported doc |
| Half-filled check-in | Lost on Back / navigation / backgrounding | Auto-saved locally; offered back with Continue editing / Discard |

## 3. Actions required per day

| Day type | Actions |
|---|---|
| Normal / unchanged (unambiguous) | **1 tap** — "No change since last check-in" |
| Still-unwell but unchanged | **1 tap** — same action; the unwell values carry forward and stay unwell (not relabelled "quiet") |
| Returned to baseline | **1 tap** — "Back to usual" (writes normal values) |
| Changed day | "Something changed" → pick only the chips that changed → Save (typically 2–4 taps) |
| Detailed entry | Open the full form → fill relevant fields → Save |

## 4. Value at each stage

- **After onboarding:** baseline framing set; the three benefits shown; a Vet
  Summary is already reachable (honest limited-data state, no filler).
- **After the first log:** a dated record exists; the timeline has started; the
  Vet Summary works from one log and shows the current main food + latest state.
- **After a week with no pattern:** a factual weekly recap (N check-ins, K
  unchanged, M changed, missing days) + a vet-ready paragraph + one neutral
  suggestion — never a "not enough data" dead-end.
- **After a repeated observation:** a symptom seen in ≥2 separate periods reads as
  "Noticed in more than one separate stretch" (Stage 2); a food exposure seen in
  ≥2 independent periods with a comparison reaches Stage 3, with counter-evidence.
- **When an observation weakens:** because the engine recomputes statelessly,
  new exposures that were **not** followed by the symptom lower the stage live
  (Stage 3 → Stage 2 once counter-evidence outnumbers the followed periods), and
  the "not followed" limitation grows.

## 5. Baseline data model + migration

- `FoodLog.endDate` (nullable) added — **V17** (`ALTER TABLE food_logs ADD COLUMN
  end_date date`). A MAIN_FOOD is the interval `[dateStarted, endDate)`; `null`
  end = still active. Existing rows keep `end_date = null` and are relinked the
  next time a food is logged (no data backfill).
- `FoodBaseline` (pure): `relinkChain` sets each main-food period's end to the
  next period's start (latest stays open); `activeOn(date)` resolves the covering
  period (end exclusive → the handover day belongs to the new food);
  `currentMainFood(today)` filters to MAIN_FOOD. `FoodLogController.create`
  relinks the chain on every new main food. Treats/supplements are point events
  and never affect the chain. History is never deleted.
- `FoodKind` already had `SUPPLEMENT`/`OTHER`; the frontend quick-log now handles
  starter species correctly instead of writing dog-shaped fields.

## 6. Evidence-stage rules (provisional — see caveats)

`EvidenceStage` (`backend/.../patterns/EvidenceStage.java`), deterministic:

- **Recurrence-only patterns** (symptom observations, no exposure to compare):
  `forRecurrence(episodeCount)` → Stage 1 if `episodeCount < 2`, else Stage 2.
  These can **never** reach an association stage — there is no denominator.
- **Food-exposure patterns** (have a comparison denominator):
  `forFoodExposure(followed, notFollowed, assessed)` →
  - `followed < 2` → falls back to the recurrence stage;
  - `notFollowed > followed` → **Stage 2** (repeated but the counter-evidence
    outweighs — this is the live weakening path);
  - `followed ≥ 3 && followed > notFollowed && assessed ≥ 3` → **Stage 4**;
  - otherwise → **Stage 3**.

All thresholds are **PROVISIONAL**: they shape how the product *talks* about
evidence and have **not** been validated against veterinary or statistical review.
They are documented as such in code and must be revisited with real data.

## 7. Why `detectionCount` is not recurrence

`PatternEngine.analyze()` recomputes candidates from the last 120 days on **every
request**. `recordDetection()` bumped `detectionCount` once per calendar day the
same candidate resurfaced — so it counts *how many days the same single piece of
evidence stayed visible* (coupled to how often the app is opened), not how many
times something independently recurred. Driving "seen a few times" off it meant a
single food→itch episode read as recurrence after two app-opens.

Fix: `detectionCount` stays **internal** (persistence/sort). A new `episodeCount`
increments **only** when a pattern reappears after going quiet for
`EPISODE_GAP_DAYS` (14) — a genuinely separate period. All "seen before / repeated"
language, and the Stage-2 gate, key off `episodeCount` (`seenBefore = episodeCount
≥ 2`). `detectionCount` is no longer in `PatternResponse`. Regression tests pin the
distinction (a 7-day continuous stretch → `episodeCount` 1, `seenBefore` false).

## 8. Before / after copy

| Surface | Before | After |
|---|---|---|
| Food-trigger headline | "Possible chicken-related pattern" | "Chicken and later changes were logged close together" |
| Vet-summary concern | "Possible food-related pattern: more itching…" | "More itching and stool changes were logged after certain foods…" |
| Food-trigger disclaimer | "This is not an allergy diagnosis…" | "This lines up food changes with what was logged afterward — not a diagnosis." |
| Recurrence line | "Seen a few times since {date}" (from detectionCount) | "Noticed in more than one separate stretch since {date}" (from episodeCount) |
| AI-note badge | "High/Medium/Low confidence" | removed |
| Quick action | "Same as usual" → "Save a quiet day" | "No change since last check-in" (+ a distinct "Back to usual") |
| Empty weekly recap | could read "Not enough data yet" | "This period included 30 check-ins, 15 unchanged days and 15 with a change…" + a vet paragraph |
| Evidence limits | muted footer disclaimer | a prominent "What this can't tell us yet" block with counter-evidence |
| Weakened observation | confidence silently overwritten; card unchanged | stage drops (3→2) and the "N of M not followed" limit grows, live |
| Activation rung | "…PetPattern can line a protein up against how {name} did afterward" | "…a rough stretch and what changed before it can be lined up for your vet to review" |

## 9. Automated tests added + results

**New backend tests** (7 files, ~30 methods): `PatternObservationTest` (episode vs
detection count), `PatternResponseSeenBeforeTest` (seenBefore from episodes; stage
derivation), `EvidenceStageTest` (stage thresholds), `FoodExposureAnalyzerTest`
(+headline guard, counter-evidence surfaced, counter-evidence weakens the stage),
`FoodBaselineTest` (relink, active-on-date, treat/supplement don't replace main
food), `DayClassifierTest` (changed vs unchanged from values), `RecapServiceTest`
(recap without a pattern; missing days stated neutrally).

**New/updated frontend tests** (+15, 123 → 138): `patterns.test.js` (memoryLine,
stageMeta), `SeenBeforeCard.test.jsx`, `checkins.test.js` (quickCheckInPayload
carry vs usual), `draft.test.js` (round-trip, scoped, clears, malformed-tolerant,
isMeaningfulDraft), and updated `TodayDecisionActions` / `TodayView` /
`PatternMemoryProgress` assertions.

**Results:** backend `mvn test` (full suite) — green; frontend `vitest run` — **138
passed**; the Part-16 required tests are covered as noted above (a few remain as
documented follow-ups — see section 11).

## 10. Builds & validation actually run

| Command | Result |
|---|---|
| `mvn test` (backend, in a Maven 21 container) | **green** (full suite, every phase) |
| `vitest run` (frontend) | **138 passed** |
| `vite build` (production web) | **built** each phase |
| `docker compose up -d --build backend` | boots; Flyway applied **V16** + **V17**; Hibernate `validate` passes |
| `docker compose up -d --build frontend` | serves the new build; no console errors |
| Runtime API smoke (demo seed on `:8317`) | current food = MAIN_FOOD with treats logged later; new main food relinks the chain; `/patterns` returns stage/episodeCount/limits/doesNotMean and **no** confidence; `/vet-summary` shows currentFood and no confidence; `/recap` returns factual counts |
| Browser (DOM) verification on `:7317` | evidence card 4-part structure + stage chips; "No change since last check-in"; vet-summary current food; re-aimed activation rung — all render, no console errors |

Not run here (environment-gated, unchanged from prior hardening): Android
debug/lint/AAB, Capacitor sync, and the Playwright e2e suite require the Android
SDK/JDK / a full running stack not present in this environment; the backend build
also runs its tests inside the Docker image build.

## 11. Remaining items

- **Veterinary / statistical review (required):** every `EvidenceStage` threshold
  and `EPISODE_GAP_DAYS` is provisional and must be validated before any stronger
  claim.
- **Physical device / emulator:** Android debug build, lint, `cap sync`, AAB, and
  the secure-storage Keystore round-trip; on-device Back/background/WebView draft
  recovery (the logic is unit-tested + code-reviewed here).
- **Deferred timeline items (Part 6):** baseline-period *spans*, a collapsed
  "quiet/steady days" marker, photo-only day events, and correction/deletion
  provenance — the last two need edit-history/soft-delete in the data model and
  should not be faked. Treat/supplement distinctness and visual hierarchy **are**
  done.
- **Vet-summary snapshot (Part 4):** DONE — current food + a no-confidence shared
  doc, plus (added after the review) an editable **"questions for your vet"**
  (`Pet.vetQuestions`, V19) and a merged **chronological event list**, both
  inherited by share/copy/PDF.
- **Play Console / production data / user testing:** listing copy is drafted
  (`docs/store-listing.md`) but not published; retention/activation impact needs
  real usage.

## 11a. Post-implementation adversarial review

The full diff was put through a multi-agent adversarial review (7 subsystem
finders → independent verifiers). It surfaced **6 confirmed defects, all fixed**:

1. **`episodeCount` measured against request cadence, not data** (the most
   important — it could have re-introduced a false "seen before" claim for a
   continuously-present symptom pattern if the owner logged check-ins for weeks
   without opening the patterns view). Fixed: `PatternObservation` now stores
   `lastObservedDate` (a DATA date) and counts a new episode only when a fresh
   detection's **earliest evidencing check-in** is a real ≥14-day gap after it;
   `PatternMemoryService` derives the evidence dates from the candidate's related
   check-ins (V18 migration). Residual: a very long unopened stretch beyond the
   analyzer window can still under/over-count at the margin — documented, and it
   now takes a far more extreme cadence than before.
2. **`FoodLogController.create`** returned the stale detached entity, so a
   backfilled mid-chain main food reported a null `endDate` in its create response
   — fixed to respond from the relinked instance.
3. **`FoodBaseline`** same-day main foods were non-deterministic — fixed with a
   `createdAt` tiebreak.
4. **Draft restore** didn't remount `CheckInView`, so a restored note stayed
   invisible in the textarea — fixed by bumping the remount key.
5. **Draft auto-save fired in edit mode**, so an abandoned edit of a past
   check-in could later be offered as a new-check-in draft with the wrong date —
   fixed by skipping auto-save while editing.
6. **An HR string** used the masculine-only "bio" for the pet — fixed to the
   slash form.

## 12. Final differentiation

**PetPattern is a low-effort health timeline that remembers the pet's baseline,
records only meaningful changes, and shows owners and vets exactly what was
observed, what repeated across genuinely separate periods, and what remains
uncertain — never a cause, a confidence score, or a diagnosis.** This is now true
in the implemented behaviour: the current main food is a real active period a
treat can't overwrite; "no change" and "back to usual" are honestly distinct;
recurrence comes from independent episodes, not engine re-runs; every possible
association ships its own counter-evidence and limitations in a prominent block;
and the weekly recap and vet summary are useful from the first day, with no
causal claim anywhere.
