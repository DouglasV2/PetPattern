# Weekly Pattern Insight (Part A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one compact "this week" insight card to the Today dashboard, generated only from existing check-in data, with three honest states: a week-over-week symptom change (INSIGHT), a calm no-change (STABLE), or a still-learning prompt (LEARNING).

**Architecture:** A new `WeeklyInsightService` (`com.petpattern.patterns`) computes a `WeeklyInsight` DTO from a pet's check-ins using today-anchored 7-day windows and the existing `BaselineCalculator`. The service is a pure, repository-free component (data passed as a parameter) so it unit-tests with `new`. `PetController.overview` calls it and adds the result to `PetOverviewResponse`, which the Today dashboard already fetches — so the frontend only renders the server-localized fields, no new fetch. All copy is localized server-side via `Copy.t` (mirroring `goodNews`/`watchOut`).

**Tech Stack:** Spring Boot 3.3.5 / Java 21 (backend), React 18 + Vite 5 (frontend), JUnit 5 (plain assertions), Postgres + Flyway.

## Global Constraints

- **Copy tone:** warm, factual, non-diagnostic. Only `čini se` / `češće se pojavljuje` / `vrijedi pratiti`; never causation, never a diagnosis. No "AI detected" language, no charts, no percentages-without-context, no badges, no daily-log pressure.
- **Honesty:** one check-in row per pet per day → express counts as **days** ("2 od 7 dana"), never events ("2 puta").
- **Evidence gate:** never state a change without **≥3 logged days** in the recent window.
- **Do not modify** `RetentionStrip` or the (separate, unbuilt) sidebar streak card.
- **i18n:** all user-facing dynamic text goes through `Copy.t` (English string IS the key; add Croatian via `put("English","Hrvatski")` in `Copy.java`'s static block). Beta serves `hr` + English fallback.
- **Build:** no local Maven/Java — backend compiles/tests via Docker; `docker compose up` needs `--build` to refresh the frontend.
- **CSS gotcha:** in `styles.css` the `≥900px` desktop block precedes the `≥700px` tablet blocks, so tablet rules leak into desktop by source order — scope new responsive rules accordingly.

---

### Task A1: `WeeklyInsight` DTO + wire a null into the overview

**Files:**
- Create: `backend/src/main/java/com/petpattern/api/dto/WeeklyInsight.java`
- Modify: `backend/src/main/java/com/petpattern/api/dto/PetOverviewResponse.java`
- Modify: `backend/src/main/java/com/petpattern/api/PetController.java:130-141` (add the component, temporarily `null`)

**Interfaces:**
- Produces: `WeeklyInsight(String state, String label, String headline, String body, String support)` record; a new trailing component `WeeklyInsight weeklyInsight` on `PetOverviewResponse`.

- [ ] **Step 1: Create the DTO**

```java
// backend/src/main/java/com/petpattern/api/dto/WeeklyInsight.java
package com.petpattern.api.dto;

/**
 * The Today dashboard's compact "this week" card. state is one of
 * "INSIGHT" (a real week-over-week change), "STABLE" (enough data, no change),
 * or "LEARNING" (fewer than 3 logs this week). All strings are already localized
 * server-side. label/support may be null.
 */
public record WeeklyInsight(
        String state,
        String tone,
        String label,
        String headline,
        String body,
        String support
) {
}
```

`tone` is one of `"good"` / `"watch"` / `"calm"` — the server decides it so the
card never has to parse localized text to pick a colour.

- [ ] **Step 2: Add the component to `PetOverviewResponse`**

Add `WeeklyInsight weeklyInsight` as the last record component:

```java
public record PetOverviewResponse(
        PetResponse pet,
        CheckInResponse latestCheckIn,
        FoodLogResponse currentFood,
        List<PatternResponse> patterns,
        String todayStatus,
        String todayExplanation,
        String nextAction,
        RetentionSummary retention,
        String goodNews,
        String watchOut,
        WeeklyInsight weeklyInsight
) {
}
```

- [ ] **Step 3: Pass `null` for now in `PetController.overview`**

In the `new PetOverviewResponse(...)` call (currently ending `watchOut(pet, recentFoodLogs)`), append `, null` as the last argument so it compiles. (Task A5 replaces it.)

- [ ] **Step 4: Compile (runs the suite)**

Run: `docker compose build backend`
Expected: build SUCCEEDS (image rebuilds, all existing tests pass).

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/petpattern/api/dto/WeeklyInsight.java backend/src/main/java/com/petpattern/api/dto/PetOverviewResponse.java backend/src/main/java/com/petpattern/api/PetController.java
git commit -m "feat(insight): add WeeklyInsight DTO to overview payload (null placeholder)"
```

---

### Task A2: `WeeklyInsightService` — LEARNING and STABLE states (TDD)

**Files:**
- Create: `backend/src/main/java/com/petpattern/patterns/WeeklyInsightService.java`
- Test: `backend/src/test/java/com/petpattern/patterns/WeeklyInsightServiceTest.java`

**Interfaces:**
- Consumes: `BaselineCalculator.between(list, start, end)`, `com.fasterxml.jackson.databind.ObjectMapper`.
- Produces: `WeeklyInsight generate(Pet pet, List<DailyCheckIn> checkIns)`; constants `WINDOW=7`, `MIN_LOGS=3`. This task returns only LEARNING (`<3` recent logs) or STABLE (`≥3`, no delta logic yet). Task A3 inserts INSIGHT detection between them.

- [ ] **Step 1: Write the failing test**

```java
// backend/src/test/java/com/petpattern/patterns/WeeklyInsightServiceTest.java
package com.petpattern.patterns;

import com.petpattern.api.dto.WeeklyInsight;
import com.petpattern.domain.DailyCheckIn;
import com.petpattern.domain.Pet;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class WeeklyInsightServiceTest {

    private final WeeklyInsightService service =
            new WeeklyInsightService(new BaselineCalculator(), new ObjectMapper());

    private static Pet pet(String name) {
        Pet pet = new Pet();
        pet.setName(name);
        return pet;
    }

    private DailyCheckIn itch(int daysAgo, Integer itching) {
        DailyCheckIn c = new DailyCheckIn();
        c.setCheckInDate(LocalDate.now().minusDays(daysAgo));
        c.setItchingScore(itching);
        return c;
    }

    @Test
    void learningWhenFewerThanThreeRecentLogs() {
        List<DailyCheckIn> checkIns = new ArrayList<>(List.of(itch(0, 2), itch(1, 2)));
        WeeklyInsight insight = service.generate(pet("Milo"), checkIns);
        assertEquals("LEARNING", insight.state());
    }

    @Test
    void stableWhenEnoughLogsButNoMeaningfulChange() {
        // 3 days this week and 3 days last week, all itching == 2 -> nothing changed.
        List<DailyCheckIn> checkIns = new ArrayList<>(List.of(
                itch(0, 2), itch(1, 2), itch(2, 2),
                itch(7, 2), itch(8, 2), itch(9, 2)));
        WeeklyInsight insight = service.generate(pet("Milo"), checkIns);
        assertEquals("STABLE", insight.state());
    }
}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `docker run --rm -v "$(pwd)/backend:/app" -w /app maven:3.9.9-eclipse-temurin-21 mvn -q test -Dtest=WeeklyInsightServiceTest`
Expected: FAIL — `WeeklyInsightService` does not exist (compilation error).

- [ ] **Step 3: Write the minimal implementation**

```java
// backend/src/main/java/com/petpattern/patterns/WeeklyInsightService.java
package com.petpattern.patterns;

import com.petpattern.api.dto.WeeklyInsight;
import com.petpattern.domain.DailyCheckIn;
import com.petpattern.domain.Pet;
import com.petpattern.i18n.Copy;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

/**
 * Builds the Today dashboard's compact "this week" card from existing check-ins.
 * Windows are today-anchored (calendar last-7 vs the 7 before it), NOT anchored on
 * the last logged day — a gap in logging must read as "still learning", not as a
 * fresh week. Repository-free: callers pass the check-ins so it unit-tests with new.
 */
@Component
public class WeeklyInsightService {

    static final int WINDOW = 7;
    static final int MIN_LOGS = 3;

    private final BaselineCalculator baseline;
    private final ObjectMapper mapper;

    public WeeklyInsightService(BaselineCalculator baseline, ObjectMapper mapper) {
        this.baseline = baseline;
        this.mapper = mapper;
    }

    public WeeklyInsight generate(Pet pet, List<DailyCheckIn> checkIns) {
        LocalDate today = LocalDate.now();
        List<DailyCheckIn> recent = baseline.between(checkIns, today.minusDays(WINDOW - 1L), today);
        List<DailyCheckIn> prior =
                baseline.between(checkIns, today.minusDays(2L * WINDOW - 1L), today.minusDays(WINDOW));

        if (recent.size() < MIN_LOGS) {
            return learning(pet);
        }
        // Task A3 inserts INSIGHT detection here.
        return stable();
    }

    private WeeklyInsight learning(Pet pet) {
        return new WeeklyInsight(
                "LEARNING",
                "calm",
                null,
                Copy.t("Still getting to know {0}'s rhythm", pet.getName()),
                Copy.t("A few short notes will help useful patterns start to show."),
                null);
    }

    private WeeklyInsight stable() {
        return new WeeklyInsight(
                "STABLE",
                "calm",
                Copy.t("THIS WEEK"),
                Copy.t("This week looks fairly steady"),
                Copy.t("We didn't spot a big change in the logged routines and behaviour."),
                null);
    }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `docker run --rm -v "$(pwd)/backend:/app" -w /app maven:3.9.9-eclipse-temurin-21 mvn -q test -Dtest=WeeklyInsightServiceTest`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/petpattern/patterns/WeeklyInsightService.java backend/src/test/java/com/petpattern/patterns/WeeklyInsightServiceTest.java
git commit -m "feat(insight): WeeklyInsightService learning + stable states"
```

---

### Task A3: Week-over-week change detection (INSIGHT) (TDD)

**Files:**
- Modify: `backend/src/main/java/com/petpattern/patterns/WeeklyInsightService.java`
- Modify: `backend/src/test/java/com/petpattern/patterns/WeeklyInsightServiceTest.java`

**Interfaces:**
- Produces: private `Optional<Candidate> bestCandidate(...)`; internal `record Candidate(String metric, String label, boolean up, int recentDays, int priorDays, int loggedDays, double strength)`. Detects (a) itching numeric delta `|Δavg| ≥ 1.0`, and (b) day-count deltas `|Δdays| ≥ 2` for boolean flags `earRedness/pawLicking/vomiting/diarrhea` and for `observationsJson` changed-days per signal key. Picks the single strongest; ties resolved by insertion order (itching first).

- [ ] **Step 1: Write the failing tests**

Add to `WeeklyInsightServiceTest`:

```java
    @Test
    void insightWhenScratchingRoseThisWeek() {
        // last week calm (itch 1), this week itchy (itch 6) -> "itchier" INSIGHT, watch tone.
        List<DailyCheckIn> checkIns = new ArrayList<>(List.of(
                itch(0, 6), itch(1, 6), itch(2, 6),
                itch(7, 1), itch(8, 1), itch(9, 1)));
        WeeklyInsight insight = service.generate(pet("Milo"), checkIns);
        assertEquals("INSIGHT", insight.state());
        assertEquals("watch", insight.tone(), "a rising symptom is a watch-tone insight");
        org.junit.jupiter.api.Assertions.assertTrue(insight.headline().contains("Milo"));
    }

    private DailyCheckIn ear(int daysAgo, boolean earRedness) {
        DailyCheckIn c = new DailyCheckIn();
        c.setCheckInDate(LocalDate.now().minusDays(daysAgo));
        c.setEarRedness(earRedness);
        return c;
    }

    @Test
    void insightWhenEarRednessAppearedThisWeekAsDayCount() {
        // ear redness on 3 of this week's days, 0 last week -> day-count INSIGHT with support.
        List<DailyCheckIn> checkIns = new ArrayList<>(List.of(
                ear(0, true), ear(1, true), ear(2, true), ear(3, false),
                ear(7, false), ear(8, false), ear(9, false)));
        WeeklyInsight insight = service.generate(pet("Milo"), checkIns);
        assertEquals("INSIGHT", insight.state());
        org.junit.jupiter.api.Assertions.assertNotNull(insight.support(),
                "day-count insights carry a 'X of Y days' support line");
    }
```

> Note: `setEarRedness(boolean)` exists (the column getter is `isEarRedness()`); confirm the setter name while implementing and adjust the fixture if it differs.

- [ ] **Step 2: Run to verify they fail**

Run: `docker run --rm -v "$(pwd)/backend:/app" -w /app maven:3.9.9-eclipse-temurin-21 mvn -q test -Dtest=WeeklyInsightServiceTest`
Expected: FAIL — both new tests get `STABLE` (no detection yet).

- [ ] **Step 3: Implement detection + selection**

Replace the `// Task A3 inserts INSIGHT detection here.` line + `return stable();` with:

```java
        return bestCandidate(pet, recent, prior)
                .map(c -> insight(pet, c))
                .orElseGet(this::stable);
    }

    /** metric+direction candidate; strength is the comparable magnitude for selection. */
    private record Candidate(String metric, String label, boolean up,
                             int recentDays, int priorDays, int loggedDays, double strength) {
    }

    private java.util.Optional<Candidate> bestCandidate(
            Pet pet, List<DailyCheckIn> recent, List<DailyCheckIn> prior) {
        List<Candidate> candidates = new java.util.ArrayList<>();

        // (a) Itching: average delta, meaningful at >= 1.0 (0-10 scale).
        java.util.OptionalDouble recentItch = baseline.averageItching(recent);
        java.util.OptionalDouble priorItch = baseline.averageItching(prior);
        if (recentItch.isPresent() && priorItch.isPresent()) {
            double delta = recentItch.getAsDouble() - priorItch.getAsDouble();
            if (Math.abs(delta) >= 1.0) {
                candidates.add(new Candidate("itching", null, delta > 0,
                        0, 0, recent.size(), Math.abs(delta) * 1.5));
            }
        }

        // (b) Boolean day-flags: count of days present, meaningful at >= 2 days.
        addDayCount(candidates, "ear_redness", recent, prior, DailyCheckIn::isEarRedness);
        addDayCount(candidates, "paw_licking", recent, prior, DailyCheckIn::isPawLicking);
        addDayCount(candidates, "vomiting", recent, prior, DailyCheckIn::isVomiting);
        addDayCount(candidates, "diarrhea", recent, prior, DailyCheckIn::isDiarrhea);

        // (c) observationsJson changed-days per signal key (starter species).
        java.util.Map<String, Integer> recentChanged = changedDaysByKey(recent);
        java.util.Map<String, String> labels = labelsByKey(recent);
        java.util.Map<String, Integer> priorChanged = changedDaysByKey(prior);
        for (var entry : recentChanged.entrySet()) {
            int r = entry.getValue();
            int p = priorChanged.getOrDefault(entry.getKey(), 0);
            if (Math.abs(r - p) >= 2) {
                candidates.add(new Candidate("observation", labels.get(entry.getKey()),
                        r > p, r, p, recent.size(), Math.abs(r - p)));
            }
        }

        return candidates.stream().max(java.util.Comparator.comparingDouble(Candidate::strength));
    }

    private void addDayCount(List<Candidate> out, String metric,
                             List<DailyCheckIn> recent, List<DailyCheckIn> prior,
                             java.util.function.Predicate<DailyCheckIn> flag) {
        int r = (int) recent.stream().filter(flag).count();
        int p = (int) prior.stream().filter(flag).count();
        if (Math.abs(r - p) >= 2) {
            out.add(new Candidate(metric, null, r > p, r, p, recent.size(), Math.abs(r - p)));
        }
    }

    private java.util.Map<String, Integer> changedDaysByKey(List<DailyCheckIn> window) {
        java.util.Map<String, Integer> changed = new java.util.LinkedHashMap<>();
        for (DailyCheckIn c : window) {
            for (var signal : com.petpattern.observations.ObservationSignals.parse(c.getObservationsJson(), mapper)) {
                if (signal.key() == null || signal.key().isBlank() || !signal.isChanged()) {
                    continue;
                }
                changed.merge(signal.key(), 1, Integer::sum);
            }
        }
        return changed;
    }

    private java.util.Map<String, String> labelsByKey(List<DailyCheckIn> window) {
        java.util.Map<String, String> labels = new java.util.LinkedHashMap<>();
        for (DailyCheckIn c : window) {
            for (var signal : com.petpattern.observations.ObservationSignals.parse(c.getObservationsJson(), mapper)) {
                if (signal.key() != null && !signal.key().isBlank()) {
                    labels.putIfAbsent(signal.key(), signal.displayLabel());
                }
            }
        }
        return labels;
    }

    private WeeklyInsight insight(Pet pet, Candidate c) {
        String eyebrow = Copy.t("THIS WEEK");
        // A symptom going UP is "watch"; easing off is "good".
        String tone = c.up() ? "watch" : "good";
        if ("itching".equals(c.metric())) {
            if (c.up()) {
                return new WeeklyInsight("INSIGHT", tone, eyebrow,
                        Copy.t("{0} scratched more often this week than last week.", pet.getName()),
                        Copy.t("It may be worth keeping an eye on — nothing conclusive on its own."),
                        null);
            }
            return new WeeklyInsight("INSIGHT", tone, eyebrow,
                    Copy.t("{0} seemed calmer this week — less scratching than last week.", pet.getName()),
                    Copy.t("A quieter stretch. Worth noting what's been the same lately."),
                    null);
        }
        // day-count metrics (booleans + observation signals): "X of Y days vs Z last week"
        String label = c.label() != null ? c.label() : dayCountLabel(c.metric());
        String headline = c.up()
                ? Copy.t("{0}: {1} came up more often this week.", pet.getName(), label)
                : Copy.t("{0}: {1} eased off this week.", pet.getName(), label);
        String support = Copy.t("Noted on {0} of {1} days, vs {2} days last week.",
                c.recentDays(), c.loggedDays(), c.priorDays());
        return new WeeklyInsight("INSIGHT", tone, eyebrow, headline,
                Copy.t("Just something the notes surfaced — worth keeping in view."), support);
    }

    private String dayCountLabel(String metric) {
        return switch (metric) {
            case "ear_redness" -> Copy.t("ear redness");
            case "paw_licking" -> Copy.t("paw licking");
            case "vomiting" -> Copy.t("vomiting");
            case "diarrhea" -> Copy.t("loose stool");
            default -> Copy.t("a change");
        };
    }
```

Add imports at the top as needed (or use the fully-qualified names shown). Prefer adding: `import java.util.List;` is already present; the code above fully-qualifies the rest to keep the diff local.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `docker run --rm -v "$(pwd)/backend:/app" -w /app maven:3.9.9-eclipse-temurin-21 mvn -q test -Dtest=WeeklyInsightServiceTest`
Expected: PASS (all tests: learning, stable, itchier, ear-redness day-count).

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/petpattern/patterns/WeeklyInsightService.java backend/src/test/java/com/petpattern/patterns/WeeklyInsightServiceTest.java
git commit -m "feat(insight): week-over-week change detection (itching + day-counts + observations)"
```

---

### Task A4: Croatian copy for every string (Copy.java)

**Files:**
- Modify: `backend/src/main/java/com/petpattern/i18n/Copy.java` (the static `{ }` block, under a new `// --- Weekly insight ---` group)

**Interfaces:**
- Consumes: the exact English keys used in `WeeklyInsightService` (Tasks A2–A3).

- [ ] **Step 1: Add the `put(...)` lines**

Inside the big `static { ... }` block in `Copy.java`, add a new group:

```java
        // --- Weekly insight (Today dashboard) -----------------------------------
        put("THIS WEEK", "OVAJ TJEDAN");
        put("Still getting to know {0}'s rhythm", "Još upoznajemo {0}ov ritam");
        put("A few short notes will help useful patterns start to show.",
                "Nekoliko kratkih bilješki pomoći će da se počnu pojavljivati korisni obrasci.");
        put("This week looks fairly steady", "Ovaj tjedan izgleda prilično stabilno");
        put("We didn't spot a big change in the logged routines and behaviour.",
                "Nismo primijetili veću promjenu u zabilježenim rutinama i ponašanju.");
        put("{0} scratched more often this week than last week.",
                "{0} se ovaj tjedan češće češao nego prošli tjedan.");
        put("It may be worth keeping an eye on — nothing conclusive on its own.",
                "Možda vrijedi pratiti — ništa samo po sebi nije zaključak.");
        put("{0} seemed calmer this week — less scratching than last week.",
                "{0} je ovaj tjedan djelovao mirnije — manje češanja nego prošli tjedan.");
        put("A quieter stretch. Worth noting what's been the same lately.",
                "Mirniji period. Vrijedi zabilježiti što je u zadnje vrijeme ostalo isto.");
        put("{0}: {1} came up more often this week.",
                "{0}: {1} se ovaj tjedan češće bilježi.");
        put("{0}: {1} eased off this week.",
                "{0}: {1} se ovaj tjedan smirilo.");
        put("Noted on {0} of {1} days, vs {2} days last week.",
                "Zabilježeno {0} od {1} dana, u odnosu na {2} dana prošli tjedan.");
        put("Just something the notes surfaced — worth keeping in view.",
                "Nešto što su bilješke istaknule — vrijedi imati na oku.");
        put("ear redness", "crvenilo u ušima");
        put("paw licking", "lizanje šapa");
        put("vomiting", "povraćanje");
        put("loose stool", "mekana stolica");
        put("a change", "promjena");
```

- [ ] **Step 2: Compile (runs the suite)**

Run: `docker compose build backend`
Expected: SUCCESS (Copy compiles; no test depends on these values yet).

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/petpattern/i18n/Copy.java
git commit -m "i18n(insight): Croatian copy for weekly insight states"
```

---

### Task A5: Wire the service into the overview

**Files:**
- Modify: `backend/src/main/java/com/petpattern/api/PetController.java` (constructor + `overview()`)

**Interfaces:**
- Consumes: `WeeklyInsightService.generate(pet, checkIns)`.

- [ ] **Step 1: Inject the service**

Add a field and constructor parameter (follow the existing final-field + constructor style):

```java
    private final WeeklyInsightService weeklyInsightService;
```

Add `WeeklyInsightService weeklyInsightService` to the constructor parameter list and `this.weeklyInsightService = weeklyInsightService;` in the body. Add the import `import com.petpattern.patterns.WeeklyInsightService;`.

- [ ] **Step 2: Replace the `null` placeholder in `overview()`**

`recentCheckIns` is already fetched for the last 21 days (covers the 14-day window). Change the last argument of `new PetOverviewResponse(...)` from `null` to:

```java
                weeklyInsightService.generate(pet, recentCheckIns)
```

- [ ] **Step 3: Compile + run suite**

Run: `docker compose build backend`
Expected: SUCCESS.

- [ ] **Step 4: Manual API check**

Run: `docker compose up -d --build` then
`curl -s http://127.0.0.1:8317/api/pets/<bellaId>/overview` (sign-in cookie required; or verify via the UI in Task A6).
Expected: JSON now contains a `weeklyInsight` object.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/petpattern/api/PetController.java
git commit -m "feat(insight): populate weeklyInsight in the overview endpoint"
```

---

### Task A6: Frontend `WeeklyInsightCard` + placement + styles

**Files:**
- Modify: `frontend/src/App.jsx` (new `WeeklyInsightCard` component + render it in `TodayView` after `RetentionStrip`)
- Modify: `frontend/src/styles.css` (a `.weekly-insight` block)

**Interfaces:**
- Consumes: `overview.weeklyInsight` = `{ state, label, headline, body, support }` (all server-localized).

- [ ] **Step 1: Add the component** (near `TodayNoteCard`, ~`App.jsx:1577`)

```jsx
function WeeklyInsightCard({ insight }) {
  if (!insight) return null
  // Tone is decided server-side ("good" | "watch" | "calm") — no text parsing here.
  return (
    <section className={`panel weekly-insight tone-${insight.tone || 'calm'}`} aria-label={insight.headline}>
      {insight.label ? <p className="kicker weekly-insight-eyebrow">{insight.label}</p> : null}
      <h2 className="weekly-insight-headline">{insight.headline}</h2>
      <p className="weekly-insight-body">{insight.body}</p>
      {insight.support ? <p className="weekly-insight-support muted">{insight.support}</p> : null}
    </section>
  )
}
```

- [ ] **Step 2: Render it in `TodayView`** — immediately after the `<RetentionStrip ... />` line and before `<section className="home-grid">`:

```jsx
      <RetentionStrip pet={pet} retention={overview?.retention} checkInCount={checkIns.length} onLogToday={onLogToday} onQuickLog={onQuickLog} />

      <WeeklyInsightCard insight={overview?.weeklyInsight} />

      <section className="home-grid">
```

- [ ] **Step 3: Add styles** to `styles.css` (place the base rule near `.retention-strip` ~line 1803; put any responsive override in a `≥900px` block that comes AFTER the `≥700px` blocks, or scope it `@media (min-width:700px) and (max-width:899.98px)`):

```css
/* Weekly insight (Today) — a calm, single-observation strip below retention. */
.weekly-insight {
  display: grid;
  gap: 0.35rem;
  border-left: 3px solid var(--line-strong);
}
.weekly-insight.tone-watch { border-left-color: var(--gold); background: var(--gold-soft); }
.weekly-insight.tone-good  { border-left-color: var(--sage); background: var(--sage-soft); }
.weekly-insight.tone-calm  { border-left-color: var(--line-strong); background: var(--paper-2); }
.weekly-insight-eyebrow { margin: 0; }
.weekly-insight-headline { margin: 0; font-size: 1.05rem; }
.weekly-insight-body { margin: 0; font-size: 0.95rem; }
.weekly-insight-support { margin: 0.15rem 0 0; font-size: 0.85rem; }
```

- [ ] **Step 4: Build the frontend**

Run: `cd frontend && npm run build`
Expected: build SUCCEEDS (no syntax errors).

- [ ] **Step 5: Verify in the browser** (preview tools)

`docker compose up -d --build`, open `http://127.0.0.1:7317`, load the Bella demo, and confirm the card renders below the retention strip on Today. Screenshot it.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/App.jsx frontend/src/styles.css
git commit -m "feat(insight): Weekly insight card on the Today dashboard"
```

---

### Task A7: End-to-end verification of the three states

**Files:** none (verification only).

- [ ] **Step 1: Full rebuild**

Run: `docker compose up -d --build`
Expected: all three containers healthy; frontend at `http://127.0.0.1:7317`.

- [ ] **Step 2: Drive each state** in the preview against dev data:
  - **LEARNING:** a pet with <3 recent logs → card shows "Još upoznajemo … ritam".
  - **INSIGHT:** with Bella's seeded history (or by adding a few high-itching days this week over a calm prior week) → card shows the scratching/day-count line with a "X od Y dana" support.
  - **STABLE:** ≥3 flat logs both weeks → "Ovaj tjedan izgleda prilično stabilno".

- [ ] **Step 3: Regression** — confirm `RetentionStrip` and the sidebar are visually unchanged; screenshot Today.

- [ ] **Step 4: Commit any copy/threshold tweaks discovered, then stop** — Part A is shippable on its own.

---

## Self-Review

- **Spec coverage:** placement (A6 ✓), three states INSIGHT/STABLE/LEARNING (A2–A3 ✓), delta from real fields (A3 ✓), ≥3-logs gate (A2 ✓), days-not-events phrasing (A3 support + A4 copy ✓), server-side localization (A4 ✓), no charts/badges/percentages (card is text-only ✓), don't touch RetentionStrip/streak (A6 renders a sibling ✓). Time-of-day / activity insights are Part B / out of scope — correctly absent here.
- **Type consistency:** `WeeklyInsight(state,tone,label,headline,body,support)` (6 components) used identically in DTO, service, and card; every `new WeeklyInsight(...)` passes `tone` as the 2nd arg. `generate(Pet, List<DailyCheckIn>)` signature matches the A5 call site (`recentCheckIns`). Boolean getters `isEarRedness/isPawLicking/isVomiting/isDiarrhea` match `BaselineCalculator`/`DailyCheckIn` extracts; confirm the `setEarRedness` setter name at implementation time (fixture note in A3).
- **Placeholders:** none — every step has real code/commands.
- **Open follow-up:** numeric metrics beyond itching (energy/appetite) are intentionally deferred (YAGNI for MVP; add later by extending `bestCandidate`).
