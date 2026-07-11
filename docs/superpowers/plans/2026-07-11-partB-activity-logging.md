# Activity Logging + Activity↔Symptom Co-occurrence (Part B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Depends on Part A being merged** (`WeeklyInsightService`, `WeeklyInsight` DTO, the Today card).

**Goal:** Let owners log activities (walks, play, …) from the Today dashboard, and surface an honest **day-level** activity↔symptom co-occurrence in the existing weekly insight card ("scratching shows up more on walk days or the next day") — never implying ordering, per-walk attribution, or causation.

**Architecture:** A new date-only `ActivityLog` entity (multiple rows per day allowed) with a pet-scoped `ActivityController` (ownership enforced via `petAccess.requireOwnedPet`, correct/delete supported). A new `ActivityExposureAnalyzer` computes co-occurrence by **distinct exposure days** (collapsing same-date rows), matching each symptom day to at most one exposure day (same-day preferred, then next-day) so overlapping windows never double-count. `WeeklyInsightService` consumes it as the highest-priority candidate. A quick-add control on Today logs activities with one tap and shows today's entries as removable chips.

**Tech Stack:** Spring Boot 3.3.5 / Java 21, JUnit 5, Postgres + Flyway, React 18 + Vite 5.

## Global Constraints

- **Date-only, no ordering:** `ActivityLog` has `occurredDate` (LocalDate) only. Never claim "after N walks", per-walk attribution, chronological ordering, or causation. Wording is strictly day-level co-occurrence ("na dan šetnje ili sljedeći dan") with `čini se` / `češće se bilježi` / `vrijedi pratiti`.
- **Aggregate by distinct exposure DAYS**, not raw rows: multiple same-date activities of a type = one exposure day. Threshold = **≥3 distinct exposure days**. A symptom day validates **at most one** exposure day (no double-count).
- **Ownership:** every activity endpoint resolves the pet via `petAccess.requireOwnedPet(petId)`; mutations verify the row's `pet.id == petId` (`findByIdAndPet`). Users can delete (and re-log to correct) any entry.
- **Copy:** localized via `Copy.t`; beta serves `hr` + English fallback. Frontend UI labels use `t()`; add Croatian to `hr.js`, the other 14 locale files fall back to English (follow-up translation task).
- **Build:** backend via Docker (`docker compose build backend` runs the suite; single test via the `docker run … mvn -Dtest=…` command); frontend via `cd frontend && npm run build`; full stack `docker compose up -d --build` (ports 7317/8317, use 127.0.0.1).
- **Migration:** `V13__activity_log.sql`, matching V2/V12 style (schema-less table name, separate FK `ALTER TABLE`, `timestamp(6) with time zone`, enum as varchar + CHECK). No DB cascade — purge child rows in the app's pet-deletion path via `deleteByPet`.

---

### Task B1: Flyway migration V13 (activity_log)

**Files:**
- Create: `backend/src/main/resources/db/migration/V13__activity_log.sql`

- [ ] **Step 1: Write the migration** (mirrors `V2__medications.sql` + `V12`'s CHECK style)

```sql
-- Activity logging: date-only walks/play/etc. Multiple rows per day are allowed
-- (a dog can have two walks), so there is deliberately NO unique constraint. Used
-- for day-level activity<->symptom co-occurrence; existing data is untouched.
CREATE TABLE activity_log (
    id uuid NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    occurred_date date NOT NULL,
    type character varying(20) NOT NULL,
    notes character varying(500),
    pet_id uuid NOT NULL,
    CONSTRAINT activity_log_pkey PRIMARY KEY (id),
    CONSTRAINT activity_log_type_check CHECK (((type)::text = ANY ((ARRAY[
        'WALK'::character varying,
        'PLAY'::character varying,
        'EXERCISE'::character varying,
        'GROOMING'::character varying,
        'OUTING'::character varying,
        'OTHER'::character varying
    ])::text[])))
);

ALTER TABLE ONLY activity_log
    ADD CONSTRAINT fk_activity_log_pet FOREIGN KEY (pet_id) REFERENCES pets(id);

CREATE INDEX ix_activity_log_pet_date ON activity_log (pet_id, occurred_date);
```

- [ ] **Step 2: Commit** (migration verified when the backend boots in B4)

```bash
git add backend/src/main/resources/db/migration/V13__activity_log.sql
git commit -m "feat(activity): V13 activity_log table"
```

---

### Task B2: `ActivityType` enum + `ActivityLog` entity

**Files:**
- Create: `backend/src/main/java/com/petpattern/domain/ActivityType.java`
- Create: `backend/src/main/java/com/petpattern/domain/ActivityLog.java`

**Interfaces:**
- Produces: `enum ActivityType { WALK, PLAY, EXERCISE, GROOMING, OUTING, OTHER }`; `ActivityLog` with getters/setters for `id, pet, occurredDate, type, notes, createdAt`.

- [ ] **Step 1: Create the enum**

```java
// backend/src/main/java/com/petpattern/domain/ActivityType.java
package com.petpattern.domain;

public enum ActivityType {
    WALK, PLAY, EXERCISE, GROOMING, OUTING, OTHER
}
```

- [ ] **Step 2: Create the entity** (mirrors `Medication`; note the enum + no unique constraint)

```java
// backend/src/main/java/com/petpattern/domain/ActivityLog.java
package com.petpattern.domain;

import jakarta.persistence.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "activity_log", indexes = @Index(name = "ix_activity_log_pet_date", columnList = "pet_id, occurred_date"))
public class ActivityLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "pet_id", nullable = false)
    private Pet pet;

    @Column(name = "occurred_date", nullable = false)
    private LocalDate occurredDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ActivityType type;

    @Column(length = 500)
    private String notes;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public UUID getId() { return id; }
    public Pet getPet() { return pet; }
    public void setPet(Pet pet) { this.pet = pet; }
    public LocalDate getOccurredDate() { return occurredDate; }
    public void setOccurredDate(LocalDate occurredDate) { this.occurredDate = occurredDate; }
    public ActivityType getType() { return type; }
    public void setType(ActivityType type) { this.type = type; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public Instant getCreatedAt() { return createdAt; }
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/petpattern/domain/ActivityType.java backend/src/main/java/com/petpattern/domain/ActivityLog.java
git commit -m "feat(activity): ActivityLog entity + ActivityType enum"
```

---

### Task B3: `ActivityLogRepository`

**Files:**
- Create: `backend/src/main/java/com/petpattern/repository/ActivityLogRepository.java`

**Interfaces:**
- Produces: `findByPetAndOccurredDateGreaterThanEqualOrderByOccurredDateAsc(Pet, LocalDate)`, `findByPetOrderByOccurredDateDesc(Pet)`, `findByIdAndPet(UUID, Pet)`, `deleteByPet(Pet)`.

- [ ] **Step 1: Create the repository** (mirrors `MedicationRepository`)

```java
// backend/src/main/java/com/petpattern/repository/ActivityLogRepository.java
package com.petpattern.repository;

import com.petpattern.domain.ActivityLog;
import com.petpattern.domain.Pet;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ActivityLogRepository extends JpaRepository<ActivityLog, UUID> {

    List<ActivityLog> findByPetAndOccurredDateGreaterThanEqualOrderByOccurredDateAsc(Pet pet, LocalDate fromDate);

    List<ActivityLog> findByPetOrderByOccurredDateDesc(Pet pet);

    Optional<ActivityLog> findByIdAndPet(UUID id, Pet pet);

    void deleteByPet(Pet pet);
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/main/java/com/petpattern/repository/ActivityLogRepository.java
git commit -m "feat(activity): ActivityLogRepository"
```

---

### Task B4: DTOs + `ActivityController` (CRUD + ownership) + delete cascade

**Files:**
- Create: `backend/src/main/java/com/petpattern/api/dto/CreateActivityRequest.java`
- Create: `backend/src/main/java/com/petpattern/api/dto/UpdateActivityRequest.java`
- Create: `backend/src/main/java/com/petpattern/api/dto/ActivityResponse.java`
- Create: `backend/src/main/java/com/petpattern/api/ActivityController.java`
- Modify: the pet-deletion orchestrator (found by grep) to purge activities

**Interfaces:**
- Produces: `GET/POST/PATCH/DELETE /api/pets/{petId}/activities[/{id}]`; `ActivityResponse(id, occurredDate, type, notes, createdAt)`.

- [ ] **Step 1: Create the DTO records**

```java
// CreateActivityRequest.java
package com.petpattern.api.dto;
import com.petpattern.domain.ActivityType;
import java.time.LocalDate;
public record CreateActivityRequest(ActivityType type, LocalDate occurredDate, String notes) {
}

// UpdateActivityRequest.java
package com.petpattern.api.dto;
import com.petpattern.domain.ActivityType;
import java.time.LocalDate;
public record UpdateActivityRequest(ActivityType type, LocalDate occurredDate, String notes) {
}

// ActivityResponse.java
package com.petpattern.api.dto;
import com.petpattern.domain.ActivityLog;
import com.petpattern.domain.ActivityType;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
public record ActivityResponse(UUID id, LocalDate occurredDate, ActivityType type, String notes, Instant createdAt) {
    public static ActivityResponse from(ActivityLog a) {
        return new ActivityResponse(a.getId(), a.getOccurredDate(), a.getType(), a.getNotes(), a.getCreatedAt());
    }
}
```

- [ ] **Step 2: Create the controller** (mirrors `MedicationController`; ownership on every handler)

```java
// backend/src/main/java/com/petpattern/api/ActivityController.java
package com.petpattern.api;

import com.petpattern.api.dto.ActivityResponse;
import com.petpattern.api.dto.CreateActivityRequest;
import com.petpattern.api.dto.UpdateActivityRequest;
import com.petpattern.auth.PetAccess;
import com.petpattern.domain.ActivityLog;
import com.petpattern.domain.Pet;
import com.petpattern.i18n.Copy;
import com.petpattern.repository.ActivityLogRepository;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/pets/{petId}/activities")
public class ActivityController {

    private static final int MAX_NOTES = 500;

    private final PetAccess petAccess;
    private final ActivityLogRepository activityRepository;

    public ActivityController(PetAccess petAccess, ActivityLogRepository activityRepository) {
        this.petAccess = petAccess;
        this.activityRepository = activityRepository;
    }

    @GetMapping
    public List<ActivityResponse> list(@PathVariable UUID petId) {
        Pet pet = petAccess.requireOwnedPet(petId);
        return activityRepository.findByPetOrderByOccurredDateDesc(pet).stream()
                .map(ActivityResponse::from)
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ActivityResponse create(@PathVariable UUID petId, @RequestBody CreateActivityRequest request) {
        Pet pet = petAccess.requireOwnedPet(petId);
        if (request.type() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, Copy.t("An activity type is required"));
        }
        LocalDate date = request.occurredDate() != null ? request.occurredDate() : LocalDate.now();
        if (date.isAfter(LocalDate.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, Copy.t("An activity can't be in the future"));
        }
        ActivityLog activity = new ActivityLog();
        activity.setPet(pet);
        activity.setType(request.type());
        activity.setOccurredDate(date);
        activity.setNotes(clean(request.notes()));
        return ActivityResponse.from(activityRepository.save(activity));
    }

    @PatchMapping("/{activityId}")
    public ActivityResponse update(@PathVariable UUID petId, @PathVariable UUID activityId,
                                   @RequestBody UpdateActivityRequest request) {
        ActivityLog activity = findActivity(petId, activityId);
        if (request.type() != null) {
            activity.setType(request.type());
        }
        if (request.occurredDate() != null) {
            if (request.occurredDate().isAfter(LocalDate.now())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, Copy.t("An activity can't be in the future"));
            }
            activity.setOccurredDate(request.occurredDate());
        }
        activity.setNotes(clean(request.notes()));
        return ActivityResponse.from(activityRepository.save(activity));
    }

    @DeleteMapping("/{activityId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID petId, @PathVariable UUID activityId) {
        activityRepository.delete(findActivity(petId, activityId));
    }

    private ActivityLog findActivity(UUID petId, UUID activityId) {
        Pet pet = petAccess.requireOwnedPet(petId);
        return activityRepository.findByIdAndPet(activityId, pet)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, Copy.t("Activity not found")));
    }

    private String clean(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        return trimmed.length() > MAX_NOTES ? trimmed.substring(0, MAX_NOTES) : trimmed;
    }
}
```

- [ ] **Step 3: Wire the delete cascade.** Find where child rows are purged when a pet is deleted:

Run: `git grep -n "deleteByPet(" -- backend/src/main/java`
Add `activityLogRepository.deleteByPet(pet);` alongside the other `deleteByPet` calls in that class (inject `ActivityLogRepository` there as a final field). This prevents an FK violation on pet deletion (no DB-level cascade).

- [ ] **Step 4: Add Croatian for the error strings** — in `Copy.java` static block, `// --- Activity logging ---` group:

```java
        put("An activity type is required", "Vrsta aktivnosti je obavezna");
        put("An activity can't be in the future", "Aktivnost ne može biti u budućnosti");
        put("Activity not found", "Aktivnost nije pronađena");
```

- [ ] **Step 5: Compile + boot (verifies migration + mapping)**

Run: `docker compose up -d --build` then `curl -s http://127.0.0.1:8317/actuator/health` → `{"status":"UP"}`.
(Flyway applies V13 on boot; a mapping/DDL mismatch fails startup — check `docker compose logs backend`.)

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/petpattern/api/dto/CreateActivityRequest.java backend/src/main/java/com/petpattern/api/dto/UpdateActivityRequest.java backend/src/main/java/com/petpattern/api/dto/ActivityResponse.java backend/src/main/java/com/petpattern/api/ActivityController.java backend/src/main/java/com/petpattern/i18n/Copy.java
# plus the pet-deletion orchestrator file from Step 3
git commit -m "feat(activity): activity CRUD endpoints with ownership + delete cascade"
```

---

### Task B5: `ActivityExposureAnalyzer` — day-level co-occurrence (TDD)

**Files:**
- Create: `backend/src/main/java/com/petpattern/patterns/ActivityExposureAnalyzer.java`
- Test: `backend/src/test/java/com/petpattern/patterns/ActivityExposureAnalyzerTest.java`

**Interfaces:**
- Produces: `Optional<ActivityCoOccurrence> scratchingAroundActivity(Pet, List<DailyCheckIn>, List<ActivityLog>)`; `record ActivityCoOccurrence(ActivityType type, int coOccurrenceDays, int exposureDays)`. Scratching = `itchingScore >= 4` or `isPawLicking()`. Fires at `coOccurrenceDays >= 3` distinct exposure days AND `k*2 >= n`.

- [ ] **Step 1: Write the failing tests**

```java
// backend/src/test/java/com/petpattern/patterns/ActivityExposureAnalyzerTest.java
package com.petpattern.patterns;

import com.petpattern.domain.ActivityLog;
import com.petpattern.domain.ActivityType;
import com.petpattern.domain.DailyCheckIn;
import com.petpattern.domain.Pet;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ActivityExposureAnalyzerTest {

    private final ActivityExposureAnalyzer analyzer = new ActivityExposureAnalyzer();

    private DailyCheckIn scratch(int daysAgo, int itch) {
        DailyCheckIn c = new DailyCheckIn();
        c.setCheckInDate(LocalDate.now().minusDays(daysAgo));
        c.setItchingScore(itch);
        return c;
    }

    private ActivityLog walk(int daysAgo) {
        ActivityLog a = new ActivityLog();
        a.setType(ActivityType.WALK);
        a.setOccurredDate(LocalDate.now().minusDays(daysAgo));
        return a;
    }

    @Test
    void firesWhenScratchingOnThreeDistinctWalkDays() {
        List<DailyCheckIn> checkIns = new ArrayList<>(List.of(scratch(2, 6), scratch(4, 6), scratch(6, 6)));
        List<ActivityLog> walks = new ArrayList<>(List.of(walk(2), walk(4), walk(6), walk(8)));
        Optional<ActivityExposureAnalyzer.ActivityCoOccurrence> result =
                analyzer.scratchingAroundActivity(new Pet(), checkIns, walks);
        assertTrue(result.isPresent());
        assertEquals(ActivityType.WALK, result.get().type());
        assertEquals(3, result.get().coOccurrenceDays());
    }

    @Test
    void doesNotFireOnTwoDistinctDays() {
        List<DailyCheckIn> checkIns = new ArrayList<>(List.of(scratch(2, 6), scratch(4, 6)));
        List<ActivityLog> walks = new ArrayList<>(List.of(walk(2), walk(4)));
        assertTrue(analyzer.scratchingAroundActivity(new Pet(), checkIns, walks).isEmpty());
    }

    @Test
    void collapsesTwoWalksOnSameDateToOneExposureDay() {
        // 2 distinct dates, but 2 walks on one of them -> still only 2 exposure days -> no fire.
        List<DailyCheckIn> checkIns = new ArrayList<>(List.of(scratch(2, 6), scratch(4, 6)));
        List<ActivityLog> walks = new ArrayList<>(List.of(walk(2), walk(2), walk(2), walk(4)));
        assertTrue(analyzer.scratchingAroundActivity(new Pet(), checkIns, walks).isEmpty());
    }

    @Test
    void doesNotDoubleCountASharedNextDaySymptom() {
        // Walks on days 2 and 3; scratching only on day 2. Day-3 walk's next-day (day 2)
        // is already consumed by day-2 walk's same-day match -> only k=1.
        List<DailyCheckIn> checkIns = new ArrayList<>(List.of(scratch(2, 6)));
        List<ActivityLog> walks = new ArrayList<>(List.of(walk(2), walk(3)));
        assertTrue(analyzer.scratchingAroundActivity(new Pet(), checkIns, walks).isEmpty());
    }
}
```

- [ ] **Step 2: Run to verify they fail**

Run: `docker run --rm -v "$(pwd)/backend:/app" -w /app maven:3.9.9-eclipse-temurin-21 mvn -q test -Dtest=ActivityExposureAnalyzerTest`
Expected: FAIL — class does not exist.

- [ ] **Step 3: Implement the analyzer**

```java
// backend/src/main/java/com/petpattern/patterns/ActivityExposureAnalyzer.java
package com.petpattern.patterns;

import com.petpattern.domain.ActivityLog;
import com.petpattern.domain.ActivityType;
import com.petpattern.domain.DailyCheckIn;
import com.petpattern.domain.Pet;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * Day-level activity<->scratching co-occurrence. The data is date-only with
 * multiple activities allowed per day, so we deliberately do NOT infer ordering
 * or attribute a symptom to a specific activity. We collapse activities to
 * distinct exposure DAYS per type, and count exposure days where scratching was
 * logged that day or the next — matching each symptom day to at most one exposure
 * day (same-day preferred) so overlapping windows never double-count.
 */
@Component
public class ActivityExposureAnalyzer {

    static final int MIN_EXPOSURE_DAYS = 3;
    static final int LOOKBACK_DAYS = 30;
    static final int MAX_RECENT = 8;
    static final int ITCH_PRESENT = 4;

    public Optional<ActivityCoOccurrence> scratchingAroundActivity(
            Pet pet, List<DailyCheckIn> checkIns, List<ActivityLog> activities) {
        if (activities.isEmpty()) {
            return Optional.empty();
        }
        LocalDate today = LocalDate.now();
        LocalDate from = today.minusDays(LOOKBACK_DAYS - 1L);

        Set<LocalDate> scratchingDays = new HashSet<>();
        for (DailyCheckIn c : checkIns) {
            boolean scratching = (c.getItchingScore() != null && c.getItchingScore() >= ITCH_PRESENT) || c.isPawLicking();
            if (scratching) {
                scratchingDays.add(c.getCheckInDate());
            }
        }

        ActivityCoOccurrence best = null;
        for (ActivityType type : ActivityType.values()) {
            List<LocalDate> exposureDays = activities.stream()
                    .filter(a -> a.getType() == type)
                    .map(ActivityLog::getOccurredDate)
                    .filter(d -> !d.isBefore(from) && !d.isAfter(today))
                    .distinct()
                    .sorted(Comparator.reverseOrder())
                    .limit(MAX_RECENT)
                    .toList();
            if (exposureDays.size() < MIN_EXPOSURE_DAYS) {
                continue;
            }

            Set<LocalDate> usedSymptomDays = new HashSet<>();
            Set<LocalDate> hitExposureDays = new HashSet<>();
            // Pass 1: same-day match (preferred).
            for (LocalDate d : exposureDays) {
                if (scratchingDays.contains(d) && !usedSymptomDays.contains(d)) {
                    usedSymptomDays.add(d);
                    hitExposureDays.add(d);
                }
            }
            // Pass 2: next-day match for exposure days not yet matched.
            for (LocalDate d : exposureDays) {
                if (hitExposureDays.contains(d)) {
                    continue;
                }
                LocalDate next = d.plusDays(1);
                if (scratchingDays.contains(next) && !usedSymptomDays.contains(next)) {
                    usedSymptomDays.add(next);
                    hitExposureDays.add(d);
                }
            }

            int k = hitExposureDays.size();
            int n = exposureDays.size();
            if (k >= MIN_EXPOSURE_DAYS && k * 2 >= n && (best == null || k > best.coOccurrenceDays())) {
                best = new ActivityCoOccurrence(type, k, n);
            }
        }
        return Optional.ofNullable(best);
    }

    public record ActivityCoOccurrence(ActivityType type, int coOccurrenceDays, int exposureDays) {
    }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `docker run --rm -v "$(pwd)/backend:/app" -w /app maven:3.9.9-eclipse-temurin-21 mvn -q test -Dtest=ActivityExposureAnalyzerTest`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/petpattern/patterns/ActivityExposureAnalyzer.java backend/src/test/java/com/petpattern/patterns/ActivityExposureAnalyzerTest.java
git commit -m "feat(activity): day-level activity/scratching co-occurrence analyzer"
```

---

### Task B6: Feed the analyzer into `WeeklyInsightService` (TDD)

**Files:**
- Modify: `backend/src/main/java/com/petpattern/patterns/WeeklyInsightService.java`
- Modify: `backend/src/test/java/com/petpattern/patterns/WeeklyInsightServiceTest.java`
- Modify: `backend/src/main/java/com/petpattern/api/PetController.java`
- Modify: `backend/src/main/java/com/petpattern/i18n/Copy.java`

**Interfaces:**
- Consumes: `ActivityExposureAnalyzer.scratchingAroundActivity(pet, checkIns, activities)`.
- Produces: new `WeeklyInsight generate(Pet, List<DailyCheckIn>, List<ActivityLog>)`; the old 2-arg `generate` becomes an overload delegating with `List.of()`.

- [ ] **Step 1: Update the constructor + add the overload + activity priority**

In `WeeklyInsightService`, add the analyzer dependency and the 3-arg method:

```java
    private final ActivityExposureAnalyzer activityAnalyzer;

    public WeeklyInsightService(BaselineCalculator baseline, ObjectMapper mapper,
                                ActivityExposureAnalyzer activityAnalyzer) {
        this.baseline = baseline;
        this.mapper = mapper;
        this.activityAnalyzer = activityAnalyzer;
    }

    public WeeklyInsight generate(Pet pet, List<DailyCheckIn> checkIns) {
        return generate(pet, checkIns, java.util.List.of());
    }

    public WeeklyInsight generate(Pet pet, List<DailyCheckIn> checkIns, List<com.petpattern.domain.ActivityLog> activities) {
        LocalDate today = LocalDate.now();
        List<DailyCheckIn> recent = baseline.between(checkIns, today.minusDays(WINDOW - 1L), today);
        List<DailyCheckIn> prior =
                baseline.between(checkIns, today.minusDays(2L * WINDOW - 1L), today.minusDays(WINDOW));

        if (recent.size() < MIN_LOGS) {
            return learning(pet);
        }
        // Activity co-occurrence is the highest-priority insight when present.
        var activity = activityAnalyzer.scratchingAroundActivity(pet, checkIns, activities);
        if (activity.isPresent()) {
            return activityInsight(activity.get());
        }
        return bestCandidate(pet, recent, prior)
                .map(c -> insight(pet, c))
                .orElseGet(this::stable);
    }
```

Remove the old single `generate(...)` body that contained the `if (recent.size() < MIN_LOGS)` block (it's now in the 3-arg version). Add the copy method:

```java
    private WeeklyInsight activityInsight(ActivityExposureAnalyzer.ActivityCoOccurrence a) {
        String eyebrow = Copy.t("THIS WEEK");
        if (a.type() == com.petpattern.domain.ActivityType.WALK) {
            return new WeeklyInsight("INSIGHT", "watch", eyebrow,
                    Copy.t("Scratching is logged more often on walk days or the day after."),
                    Copy.t("It's a co-occurrence, not a cause — but it's worth keeping an eye on."),
                    Copy.t("Seen on {0} of the last {1} days linked to a walk.",
                            a.coOccurrenceDays(), a.exposureDays()));
        }
        return new WeeklyInsight("INSIGHT", "watch", eyebrow,
                Copy.t("Scratching is logged more often around activity days."),
                Copy.t("It's a co-occurrence, not a cause — but it's worth keeping an eye on."),
                Copy.t("Seen on {0} of the last {1} days linked to an activity.",
                        a.coOccurrenceDays(), a.exposureDays()));
    }
```

- [ ] **Step 2: Fix the existing test's constructor + add an activity test**

Update the field initializer in `WeeklyInsightServiceTest`:

```java
    private final WeeklyInsightService service =
            new WeeklyInsightService(new BaselineCalculator(), new ObjectMapper(), new ActivityExposureAnalyzer());
```

Add a test:

```java
    private com.petpattern.domain.ActivityLog walk(int daysAgo) {
        com.petpattern.domain.ActivityLog a = new com.petpattern.domain.ActivityLog();
        a.setType(com.petpattern.domain.ActivityType.WALK);
        a.setOccurredDate(LocalDate.now().minusDays(daysAgo));
        return a;
    }

    @Test
    void activityCoOccurrenceTakesPriority() {
        List<DailyCheckIn> checkIns = new ArrayList<>(List.of(
                itch(0, 6), itch(2, 6), itch(4, 6),   // 3 recent logged days (>=MIN_LOGS), scratching
                itch(7, 6), itch(8, 6), itch(9, 6)));
        List<com.petpattern.domain.ActivityLog> walks =
                new ArrayList<>(List.of(walk(0), walk(2), walk(4), walk(6)));
        WeeklyInsight insight = service.generate(pet("Milo"), checkIns, walks);
        assertEquals("INSIGHT", insight.state());
        org.junit.jupiter.api.Assertions.assertNotNull(insight.support());
        org.junit.jupiter.api.Assertions.assertTrue(insight.support().contains("3"));
    }
```

- [ ] **Step 3: Add Croatian copy** — `Copy.java`, extend the `// --- Weekly insight ---` group:

```java
        put("Scratching is logged more often on walk days or the day after.",
                "Češanje se češće bilježi na dan šetnje ili sljedeći dan.");
        put("Scratching is logged more often around activity days.",
                "Češanje se češće bilježi na dane s aktivnošću ili sljedeći dan.");
        put("It's a co-occurrence, not a cause — but it's worth keeping an eye on.",
                "Radi se o istodobnoj pojavi, ne o uzroku — ali vrijedi pratiti.");
        put("Seen on {0} of the last {1} days linked to a walk.",
                "Zabilježeno je u {0} od posljednja {1} dana povezana sa šetnjom.");
        put("Seen on {0} of the last {1} days linked to an activity.",
                "Zabilježeno je u {0} od posljednja {1} dana povezana s aktivnošću.");
```

- [ ] **Step 4: Fetch + pass activities in `PetController.overview`**

Inject `ActivityLogRepository activityLogRepository` (final field + constructor param). In `overview()`, fetch and pass activities:

```java
        List<ActivityLog> recentActivities =
                activityLogRepository.findByPetAndOccurredDateGreaterThanEqualOrderByOccurredDateAsc(pet, today.minusDays(30));
```

Change the weekly-insight argument to `weeklyInsightService.generate(pet, recentCheckIns, recentActivities)`. Add imports `com.petpattern.domain.ActivityLog`, `com.petpattern.repository.ActivityLogRepository`.

- [ ] **Step 5: Run the service tests, then full build**

Run: `docker run --rm -v "$(pwd)/backend:/app" -w /app maven:3.9.9-eclipse-temurin-21 mvn -q test -Dtest=WeeklyInsightServiceTest,ActivityExposureAnalyzerTest`
Expected: PASS. Then `docker compose build backend` → SUCCESS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/petpattern/patterns/WeeklyInsightService.java backend/src/test/java/com/petpattern/patterns/WeeklyInsightServiceTest.java backend/src/main/java/com/petpattern/api/PetController.java backend/src/main/java/com/petpattern/i18n/Copy.java
git commit -m "feat(activity): surface activity co-occurrence in the weekly insight"
```

---

### Task B7: Frontend — activity API + quick-add on Today

**Files:**
- Modify: `frontend/src/api.js` (three entries)
- Modify: `frontend/src/App.jsx` (state, handlers, `ActivityQuickAdd` component, TodayView wiring, loadPetData)
- Modify: `frontend/src/styles.css` (quick-add chips)
- Modify: `frontend/src/locales/hr.js` (Croatian labels)

- [ ] **Step 1: Add api.js entries** (one-liner arrows on the `api` object, near `deleteMedication`)

```js
  listActivities: (petId) => request(`/pets/${petId}/activities`),
  addActivity: (petId, payload) => request(`/pets/${petId}/activities`, { method: 'POST', body: JSON.stringify(payload) }),
  deleteActivity: (petId, activityId) => request(`/pets/${petId}/activities/${activityId}`, { method: 'DELETE' }),
```

- [ ] **Step 2: Load activities with the rest** — in `loadPetData` add `api.listActivities(petId)` to the `Promise.all` and destructure `nextActivities`, then `setActivities(nextActivities)`. Add `const [activities, setActivities] = useState([])` near the other pet-data state.

- [ ] **Step 3: Add handlers** (near `createMedication`/`removeFoodLog`)

```jsx
  async function addActivity(type) {
    if (!selectedPet) return
    setError('')
    try {
      await api.addActivity(selectedPet.id, { type, occurredDate: today })
      await loadPetData(selectedPet.id)   // refreshes activities + overview (weekly insight)
    } catch (err) {
      setError('Could not log the activity. Try again in a moment.')
    }
  }

  async function removeActivity(activity) {
    if (!selectedPet || !activity) return
    if (!window.confirm('Remove this activity?')) return
    setError('')
    try {
      await api.deleteActivity(selectedPet.id, activity.id)
      await loadPetData(selectedPet.id)
    } catch (err) {
      setError('Could not remove the activity. Try again in a moment.')
    }
  }
```

- [ ] **Step 4: Add the `ActivityQuickAdd` component** (near `TodayNoteCard`)

```jsx
const ACTIVITY_TYPES = ['WALK', 'PLAY', 'EXERCISE', 'GROOMING', 'OUTING', 'OTHER']

function activityLabel(type) {
  switch (type) {
    case 'WALK': return t('Walk')
    case 'PLAY': return t('Play')
    case 'EXERCISE': return t('Exercise')
    case 'GROOMING': return t('Grooming')
    case 'OUTING': return t('Outing')
    default: return t('Other')
  }
}

function ActivityQuickAdd({ todayActivities, onAdd, onRemove }) {
  return (
    <section className="panel activity-quickadd" aria-label={t('Log an activity')}>
      <div className="panel-heading">
        <PawPrint size={18} />
        <h2>{t('Log an activity')}</h2>
      </div>
      <div className="activity-chip-row">
        {ACTIVITY_TYPES.map((type) => (
          <button key={type} className="chip activity-add-chip" type="button" onClick={() => onAdd(type)}>
            + {activityLabel(type)}
          </button>
        ))}
      </div>
      {todayActivities?.length ? (
        <div className="activity-today-row">
          {todayActivities.map((a) => (
            <span key={a.id} className="chip activity-logged-chip">
              {activityLabel(a.type)}
              <button className="chip-x" type="button" aria-label={t('Remove')} onClick={() => onRemove(a)}>×</button>
            </span>
          ))}
        </div>
      ) : null}
    </section>
  )
}
```

- [ ] **Step 5: Wire it into `TodayView`** — pass props from the `TodayView` mount site (`App.jsx:1502-1524`): add `activities={activities} onAddActivity={addActivity} onRemoveActivity={removeActivity}` to the `<TodayView ... />` element, and add those three to the `TodayView({ ... })` param list. Render the quick-add just above `RetentionStrip`:

```jsx
      <ActivityQuickAdd
        todayActivities={(activities || []).filter((a) => a.occurredDate === today)}
        onAdd={onAddActivity}
        onRemove={onRemoveActivity}
      />

      <RetentionStrip pet={pet} retention={overview?.retention} checkInCount={checkIns.length} onLogToday={onLogToday} onQuickLog={onQuickLog} />
```

- [ ] **Step 6: Add styles** (`styles.css`, near the other chip rules)

```css
.activity-quickadd .activity-chip-row,
.activity-quickadd .activity-today-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.activity-today-row { margin-top: 0.6rem; }
.activity-add-chip { cursor: pointer; }
.activity-logged-chip { background: var(--sage-soft); }
.chip-x {
  margin-left: 0.35rem;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
}
```

- [ ] **Step 7: Croatian labels** — add to `frontend/src/locales/hr.js` (new `// Activities` section):

```js
  'Log an activity': 'Zabilježi aktivnost',
  'Walk': 'Šetnja',
  'Play': 'Igra',
  'Exercise': 'Vježba',
  'Grooming': 'Njega',
  'Outing': 'Izlazak',
  'Other': 'Ostalo',
  'Remove': 'Ukloni',
```

> The other 14 locale files fall back to English automatically (i18n.js). A follow-up task can add professional translations; do not fabricate them here.

- [ ] **Step 8: Build the frontend**

Run: `cd frontend && npm run build`
Expected: SUCCESS.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/api.js frontend/src/App.jsx frontend/src/styles.css frontend/src/locales/hr.js
git commit -m "feat(activity): quick-add activities on Today + remove"
```

---

### Task B8: End-to-end verification

**Files:** none (verification only).

- [ ] **Step 1: Full rebuild** — `docker compose up -d --build`; `curl -s http://127.0.0.1:8317/actuator/health` → UP.

- [ ] **Step 2: Log activities** in the preview (`http://127.0.0.1:7317`, Bella): tap **Šetnja** a few times across different days (use the PATCH/date or re-seed to create ≥3 distinct walk days with scratching on/after them). Confirm:
  - Today shows the quick-add with today's walk chip; the **×** removes it.
  - After ≥3 distinct walk days co-occur with scratching, the weekly insight card shows **"Češanje se češće bilježi na dan šetnje ili sljedeći dan."** with **"… u 3 od posljednja N dana povezana sa šetnjom."**

- [ ] **Step 3: Honesty check** — confirm the copy never says "nakon N šetnji" / implies ordering; support is phrased in **days**.

- [ ] **Step 4: Ownership check** — `DELETE /api/pets/{otherPetId}/activities/{id}` for an id belonging to a different pet returns 404 (not 204).

- [ ] **Step 5: Regression** — `RetentionStrip`, sidebar, and Part A states still render correctly.

- [ ] **Step 6: Final full suite** — `docker compose build backend` (all tests) + `cd frontend && npm run build`.

---

## Self-Review

- **Spec coverage:** date-only ActivityLog (B2 ✓), aggregate by distinct exposure days / ≥3 threshold / no double-count (B5 ✓ with dedicated tests), correct+delete + ownership on every endpoint (B4 ✓), day-level non-causal wording, no "after N walks" (B6 copy ✓), quick-add on Today (B7 ✓), feeds the same insight card (B6 ✓), delete cascade wired (B4 Step 3 ✓). Event-level/time-of-day remain out of scope (per spec Non-goals).
- **Type consistency:** `ActivityCoOccurrence(type, coOccurrenceDays, exposureDays)` used identically in B5 and B6; `generate(Pet, List<DailyCheckIn>, List<ActivityLog>)` matches the B6 call site in `PetController`; `scratchingAroundActivity` signature matches its test. `activityLabel`/`ACTIVITY_TYPES` consistent between component and handlers.
- **Placeholders:** none — full code/SQL/commands in every step. The only deferred items are explicitly flagged (14 non-Croatian locale translations → English fallback; the pet-deletion orchestrator file located via `git grep` in B4 Step 3).
- **Ordering note:** B6 depends on B5's class and on Part A's `WeeklyInsightService`; B4 depends on B2/B3; B7 depends on B4's endpoints. Execute in order.
