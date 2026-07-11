# Weekly Pattern Insight + Activity Logging — Design

**Date:** 2026-07-11
**Status:** Awaiting user review
**Author:** Claude (brainstorming session)

## Goal

Give owners a useful, honest reason to keep logging: one compact "this week"
insight card on the Today dashboard, generated **only from real logged data**,
with no pressure, guilt, exaggerated AI claims, or generic filler.

The feature ships in **two parts**:

- **Part A — Weekly Pattern Insight** over existing check-in data (week-over-week
  deltas, stable-routine, sparse-data states).
- **Part B — Activity logging** (a new `ActivityLog` entity + quick-add UI) so an
  activity→symptom insight ("scratching after walks") can be generated from real
  activity data instead of being fabricated.

## Feasibility summary (verified against real fields)

An adversarial pass over the actual entities/parsers established what each insight
type can honestly be built from:

| Insight type | Verdict | Real fields it draws on |
|---|---|---|
| **Week-over-week delta** (increase/decrease) | ✅ feasible | Numeric per-day scores `itchingScore, energyScore, appetiteScore, sleepQualityScore, stoolScore, waterIntakeMl`; boolean day-flags `vomiting, diarrhea, earRedness, pawLicking, straining, weightConcern`; "non-normal day" enum counts (appetite/water/energy level, cat litterBox/urination/hiding); starter-species `observationsJson` signals (changed-days count) |
| **Stable routine** (no meaningful change) | ✅ feasible | Same data, inverted: enough logged days + no signal changed on ≥2 days |
| **Sparse / still-learning** (<3 logs) | ✅ feasible | Check-in count in the recent window |
| **Time-of-day** ("calmer in the evenings") | ❌ infeasible | **No hour granularity exists.** `DailyCheckIn.checkInDate` is `LocalDate`; `createdAt` is unreliable row-insert time; unique `(pet, check_in_date)` = one row/day, so morning vs evening cannot coexist. **Out of scope.** |
| **Activity→symptom** — *day-level co-occurrence* only ("on walk days / next day") | ❌ infeasible *today* → ✅ enabled by Part B | No activity/event entity exists. Part B adds a **date-only** one. **Event-level "after" ordering stays infeasible** — it would need timestamps on both the activity and the symptom (see Non-goals). |

### Honesty rule that shapes all copy

Because there is exactly **one check-in row per pet per calendar day**, a symptom
is a per-day *state*, never a per-day *count of events*. So the copy says **"2 of 7
days"** (`dana`), never **"2 times"** (`puta`). The spec's original example wording
("2 puta") is corrected to days throughout.

## Non-goals (explicitly out of scope)

- Time-of-day insights (morning/evening) — requires a new timestamped observation
  model and removal of the one-row-per-day constraint. Deferred.
- **Event-level "after an activity" insights** (true chronological ordering /
  attributing a symptom to a *specific* walk) — the current data is date-only on
  both sides, and multiple same-day activities make ordering and per-event
  attribution impossible. A later version would need **timestamps on both the
  activity and the symptom**. Until then, activity insights are strictly
  **day-level co-occurrence** (see Part B). Deferred.
- Charts, percentages-without-context, badges, "AI detected" language, daily-log
  pressure, streak/gamification pressure.
- Changes to the sidebar streak card or the existing `RetentionStrip`.

---

## Part A — Weekly Pattern Insight

### Backend

**New service `WeeklyInsightService`** (package `com.petpattern.patterns`) that,
given a pet and its check-ins (+ Part B activities), produces a single
`WeeklyInsight`. It reuses the existing analytics stack:

- `BaselineCalculator.recentDays / baselineBeforeRecentDays / between / averageItching / averageNullable` — window split + aggregation ([BaselineCalculator.java:15](backend/src/main/java/com/petpattern/patterns/BaselineCalculator.java:15)).
- `ObservationPatternAnalyzer` changed-days-per-signal-key loop — reused with a 7-day window for starter-species/`visible_change` signals ([ObservationPatternAnalyzer.java:43](backend/src/main/java/com/petpattern/patterns/ObservationPatternAnalyzer.java:43)).
- `RecapService`-style recent-vs-prior delta + the existing ≥1.0 "meaningful change" bar for 0–10 scores ([RecapService.java:148](backend/src/main/java/com/petpattern/recap/RecapService.java:148)).

**Windows:** recent = `today-6 … today`, prior = `today-13 … today-7` (two adjacent
7-day windows), pulled in one fetch via
`findByPetAndCheckInDateGreaterThanEqualOrderByCheckInDateAsc(pet, today-13)`.

**DTO** `WeeklyInsight` (record):

```java
public record WeeklyInsight(
    String state,     // "INSIGHT" | "STABLE" | "LEARNING"
    String label,     // localized eyebrow ("OVAJ TJEDAN"); null for LEARNING
    String headline,  // localized short human headline
    String body,      // localized one-sentence explanation
    String support    // nullable localized subtle value ("4 od 7 dana" / "nakon 3 od 4 šetnje")
) {}
```

All four strings are localized **server-side via `com.petpattern.i18n.Copy.t`**
(positional `{0}` args, Accept-Language aware) — the exact mechanism `goodNews` /
`watchOut` already use ([PetController.java:166](backend/src/main/java/com/petpattern/api/PetController.java:166)).

**Integration:** add a `WeeklyInsight weeklyInsight` field to
`PetOverviewResponse` and populate it in `PetController.overview` alongside
`goodNews`/`watchOut` ([PetController.java:130](backend/src/main/java/com/petpattern/api/PetController.java:130)). The Today dashboard **already fetches
`overview`**, so no new endpoint or frontend fetch is required.

### Insight selection (single best — never multiple)

`WeeklyInsightService.generate(...)` resolves exactly one card:

1. **LEARNING** if recent-7-day logged days `< 3`. → sparse progress card.
2. Otherwise gather candidates, each with a "meaningfulness" score:
   - **Activity→symptom** correlations from Part B (`≥3` co-occurrences) — highest priority when present.
   - **Numeric-score deltas** (0–10 scores + waterIntakeMl): `|recentAvg − priorAvg| ≥ 1.0` (reuse RecapService bar).
   - **Day-count deltas** (boolean flags, "non-normal" enum days, `observationsJson` changed-days): `|recentDays − priorDays| ≥ 2`.
   - Each candidate requires `≥3` relevant logs in the recent window (product gate).
3. If any candidate qualifies → **INSIGHT** built from the single top-ranked one
   (direction-aware headline: eased/calmer vs more-frequent).
4. Else (enough data, nothing meaningful) → **STABLE**.

`support` is set only where an honest, clear value exists — day-count deltas
("`{recent} od {n} dana, u odnosu na {prior} dana prošli tjedan`") and
activity correlations ("`nakon {k} od {n} šetnji`"). Numeric-score deltas state
direction in prose and omit raw numbers (no percentages-without-context).

**Wording constraints (enforced in copy):** only `čini se` / `češće se pojavljuje`
/ `vrijedi pratiti`; never causation; never a diagnosis; days not events.

### Frontend

**New component `WeeklyInsightCard`** rendered at the blank line
[App.jsx:1763](frontend/src/App.jsx:1763) — directly below `<RetentionStrip>`
([App.jsx:1762](frontend/src/App.jsx:1762)) and above `<section className="home-grid">`
([App.jsx:1764](frontend/src/App.jsx:1764)), inside `TodayView`'s main column
(NOT the sidebar). Reads `overview?.weeklyInsight`; renders `null` if absent.

- `className="panel weekly-insight"` — reuses the base `.panel` card look; tonal
  accent by state using existing tokens (`.moment.good` sage-soft for calmer/stable,
  `.moment.watch` gold-soft for a rising symptom worth watching).
- Structure: eyebrow `.kicker` (label) → `<h2>` headline (sans, not Fraunces) →
  `.lead`/body sentence → optional subtle `support` line (muted).
- Mobile responsive; any desktop-only rule goes in a `@media (min-width:900px)`
  block placed **after** the ≥700px tablet blocks, or scoped
  `@media (min-width:700px) and (max-width:899.98px)` — per the known
  styles.css media-order gotcha.

---

## Part B — Activity logging + activity→symptom correlation

### Entity `ActivityLog` (`com.petpattern.domain`)

```java
@Entity @Table(name = "activity_log",
   indexes = @Index(name = "ix_activity_pet_date", columnList = "pet_id, occurred_date"))
class ActivityLog {
    UUID id;
    @ManyToOne Pet pet;
    LocalDate occurredDate;            // date-only; time-of-day is out of scope
    @Enumerated(STRING) ActivityType type;   // WALK, PLAY, EXERCISE, GROOMING, OUTING, OTHER
    String notes;                      // nullable, <= 500 chars
    Instant createdAt;                 // row insert
}
```

**No unique constraint** — multiple activities per day are allowed (a dog can have
two walks). Date-only anchoring matches the correlation approach (date-window, like
`FoodExposureAnalyzer`); no time captured.

**Migration `V13__activity_log.sql`** (next after V12): create `activity_log` +
the `(pet_id, occurred_date)` index.

**Repository `ActivityLogRepository`:**
`findByPetAndOccurredDateGreaterThanEqualOrderByOccurredDateAsc`,
`findByPetOrderByOccurredDateDesc`, `deleteByIdAndPet`-guarded delete.

**API (new `ActivityController`) — ownership enforced on EVERY endpoint.**
Each handler resolves the pet through `petAccess.requireOwnedPet(petId)` — the same
guard `PetController.findPet` uses ([PetController.java:356](backend/src/main/java/com/petpattern/api/PetController.java:356)), which throws
`403/404` if the signed-in owner is neither owner nor caregiver of the pet.
Mutations additionally verify the target `ActivityLog.pet.id == petId` so an id from
another pet can never be read, edited, or deleted.
- `POST /api/pets/{petId}/activities` — `{ type, occurredDate?, notes? }` (date defaults to today).
- `GET /api/pets/{petId}/activities` — recent list.
- `PATCH /api/pets/{petId}/activities/{id}` — **correct** an accidental entry (type / date / notes).
- `DELETE /api/pets/{petId}/activities/{id}` — **remove** an accidental entry.

Users can always fix a mistake: the Today quick-add list shows each logged activity
with edit + remove affordances, wired to the PATCH/DELETE endpoints above.

### Analyzer `ActivityExposureAnalyzer` (`com.petpattern.patterns`)

Mirrors `FoodExposureAnalyzer.possibleFoodTrigger` ([FoodExposureAnalyzer.java:28](backend/src/main/java/com/petpattern/patterns/FoodExposureAnalyzer.java:28)),
but with a **strict day-level, ordering-free** design forced by the data (date-only
activities, once-daily check-ins, multiple same-day activities allowed):

**Exposure aggregation — by day, not by row:**
- Collapse `ActivityLog` rows to distinct **exposure days** keyed by
  `(pet, activityType, occurredDate)`. Two `WALK` rows on the same date = **one**
  walk exposure day. The threshold counts **distinct exposure days, never raw rows.**
- For each activity type, take the last `n` exposure days in the lookback window.

**Co-occurrence — matched to at most one exposure day (no double-count):**
- The exposure window for an exposure day `d` is the date set `{d, d+1}`. A symptom
  day is attributed to **at most one** exposure day — **prefer the same-day match,
  then the next-day match** — so overlapping same-day/next-day windows across
  adjacent activity days can never count one symptom twice.
- `k` = distinct exposure days whose `{d, d+1}` window contains the symptom;
  `n` = distinct exposure days considered.

**Firing gate:** only when `k ≥ 3` **distinct exposure days** (not 3 rows) show the
same symptom, and `k` is a strong share of `n`. Produces a candidate
`{ activityType, symptom, k, n }`, fed to `WeeklyInsightService` as the
highest-priority candidate.

**Wording — day-level co-occurrence, never ordering or causation:**
- Headline: `Češanje se češće bilježi na dan šetnje ili sljedeći dan.`
- Support: `Zabilježeno je u 3 od posljednja 4 dana povezana sa šetnjom.`
- **Forbidden:** "nakon 3 od 4 šetnje" / "after N walks" or any phrasing implying
  chronological ordering, per-walk attribution, or causation. The data supports only
  "on the day of / the day after a walk," at day granularity.

### Frontend — quick-add on Today

A compact quick-add control in `TodayView` (near the top of the main column):

- A row/button **"Zabilježi aktivnost"** that opens an inline lightweight picker:
  type chips (Šetnja / Igra / Vježba / Njega / Izlazak / Ostalo) + optional note +
  Save. `POST`s to the activities endpoint, then re-loads pet data.
- Today's logged activities show as small chips (e.g. `🐾 Šetnja`) next to the
  control, and activities are merged into the `RecentTimeline` memory feed.
- Each chip has **edit + remove** affordances (→ `PATCH`/`DELETE`) so an accidental
  or wrong entry is trivially corrected.
- No pressure/quota UI — logging is optional and celebratory-neutral.

---

## i18n

- **Fixed UI strings** (frontend `t('English key')`, added to all 15 locale files +
  English base): "Log activity", the six activity-type names, "THIS WEEK" eyebrow if
  rendered client-side, empty/aria labels.
- **Dynamic insight text** (backend `Copy.t`): headlines/bodies/support for INSIGHT
  (each direction), STABLE, LEARNING, and the activity-correlation sentence — added
  to `com.petpattern.i18n.Copy` for every locale it already covers (mirroring
  `goodNews`/`watchOut`; Croatian + English required).

## Copy (canonical Croatian, English mirrors)

- **INSIGHT — symptom eased:** `{name} je ovaj tjedan bio mirniji` / `Nemir je
  zabilježen 2 od 7 dana, u odnosu na 5 dana prošli tjedan.`
- **INSIGHT — symptom rose:** `{name} se ovaj tjedan češće češao` / `Češanje je
  zabilježeno 4 od 7 dana, u odnosu na 1 dan prošli tjedan.` *(tone: watch)*
- **INSIGHT — activity link (day-level co-occurrence):**
  `Češanje se češće bilježi na dan šetnje ili sljedeći dan` /
  `Zabilježeno je u 3 od posljednja 4 dana povezana sa šetnjom.`
  *(never "nakon N šetnji" — no ordering, no per-walk attribution, no causation.)*
- **STABLE:** `Ovaj tjedan izgleda prilično stabilno` / `Nismo primijetili veću
  promjenu u zabilježenim rutinama i ponašanju.`
- **LEARNING:** `Još upoznajemo {name}ov ritam` / `Nekoliko kratkih bilješki pomoći
  će da se počnu pojavljivati korisni obrasci.`
- **Eyebrow:** `OVAJ TJEDAN` (INSIGHT + STABLE only).

## Testing / verification

- **Three insight states** driven in the browser preview against dev data (Bella):
  real INSIGHT (seed a week-over-week delta), STABLE (flat data + ≥3 logs),
  LEARNING (<3 logs).
- **Activity correlation:** seed ≥3 **distinct** walk days with itching the same/next
  day → card shows the day-level co-occurrence insight; 2 distinct days → it does not
  fire; **two walks on one date collapse to a single exposure day** (does not push a
  2-day pattern to 3); a symptom day shared by adjacent walk days is **counted once**.
- **Regression:** confirm `RetentionStrip` is visually and behaviourally unchanged.
  (The sidebar streak card is a separate, currently **unbuilt/paused** feature —
  only backend `streakDays` exists; this work must not block or conflict with it.)
- Backend unit tests for `WeeklyInsightService` selection (each state + threshold
  boundaries) and `ActivityExposureAnalyzer`: fires at 3 distinct exposure days but
  not 2; same-date duplicate rows collapse to one day; shared same-day/next-day
  symptom is not double-counted; ownership guard rejects a foreign pet's activity id.

## Reused building blocks (no reinvention)

- `BaselineCalculator`, `ObservationPatternAnalyzer`, `RecapService` windowing,
  `FoodExposureAnalyzer` (analyzer template), `PatternEngine` (≥7-check-in gate).
- `PetOverviewResponse` + `PetController.overview` + `Copy.t` localization.
- `.panel`, `.panel-heading`, `.moment.good/.watch`, `.kicker`, `.lead`,
  `.recap-stat` CSS vocabulary; lucide icons (`Activity`, `CalendarRange`, `PawPrint`).
- `DailyCheckInRepository` / `FoodLogRepository` range queries as the pattern for
  `ActivityLogRepository`.

## Open risks

- **Species relevance of activity types:** "walk" is dog-centric. Types stay generic
  + `notes`; correlation only fires per-type with real repeat data, so irrelevant
  types simply never produce an insight.
- **Copy volume across locales:** backend `Copy` may not cover all 15 languages;
  fill Croatian + English and whatever set `goodNews`/`watchOut` already cover,
  falling back to English otherwise (existing behaviour).
- **Selection tuning:** thresholds (≥2 day-count delta, ≥1.0 score delta, ≥3
  distinct activity exposure days) may need tuning against real data after launch.
