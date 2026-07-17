package com.petpattern.patterns;

import com.petpattern.domain.DailyCheckIn;
import com.petpattern.domain.Pet;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.function.Predicate;

/**
 * Shared helpers for the immediate safety layer (Layer A), the counterpart of the
 * historical pattern-memory layer (Layer B, {@link PatternEngine}).
 *
 * <p>The immediate layer answers one narrow, safety-first question — "did the owner log an
 * urgent combination that is happening right now?" — and it does so with <em>no</em>
 * seven-check-in gate, so it fires on the very first check-in. This class centralises the
 * "is it current?" contract so every species decides it the same way: the declarative
 * starter rules (via {@link StarterRuleEngine#runImmediate}) and the structured dog/cat
 * rules alike.
 *
 * <p>Two hard invariants keep it medically cautious and honest:
 * <ul>
 *   <li>only genuine {@link Severity#URGENT} combinations reach it — a single mild or
 *       ambiguous selection can never raise urgency;</li>
 *   <li>it self-resolves: an urgent sign drops off once it falls outside the freshness
 *       window <em>or</em> is superseded by newer normal logging, and nothing here is ever
 *       persisted, so an immediate observation can never silently become a "recurring
 *       pattern" (that path is {@link PatternEngine} + {@link PatternMemoryService}, gated
 *       on independent historical criteria).</li>
 * </ul>
 */
final class ImmediateObservations {

    /** Outer freshness bound vs today: an urgent sign older than this is not "happening now". */
    static final int URGENT_WINDOW_DAYS = 7;

    /**
     * How close to the pet's most recent entry the urgent sign must sit. With 2, an urgent
     * sign on the latest logged day or the day before it is still current; two or more newer
     * normal days supersede it and it resolves.
     */
    static final int ACTIVE_NEAR_LATEST_DAYS = 2;

    private ImmediateObservations() {
    }

    /** The pet's most recent check-in date that is not in the future, or {@code null} if none. */
    static LocalDate latestEntry(List<DailyCheckIn> checkIns) {
        LocalDate today = LocalDate.now();
        LocalDate latest = null;
        for (DailyCheckIn checkIn : checkIns) {
            LocalDate date = checkIn.getCheckInDate();
            if (date != null && !date.isAfter(today) && (latest == null || date.isAfter(latest))) {
                latest = date;
            }
        }
        return latest;
    }

    /**
     * True when an urgent sign observed on {@code signalDay} is still current for a pet whose
     * most recent entry is {@code latestEntry}: within the today-anchored freshness window AND
     * not superseded by newer normal logging.
     */
    static boolean isCurrent(LocalDate signalDay, LocalDate latestEntry) {
        if (signalDay == null || latestEntry == null) {
            return false;
        }
        LocalDate today = LocalDate.now();
        return !signalDay.isBefore(today.minusDays(URGENT_WINDOW_DAYS - 1L))
                && !signalDay.isBefore(latestEntry.minusDays(ACTIVE_NEAR_LATEST_DAYS - 1L));
    }

    /**
     * Build at most one urgent candidate for dog/cat structured check-ins: the most recent day
     * on which {@code trigger} holds and is still {@link #isCurrent current}. Returns empty when
     * no current day qualifies. The id is namespaced {@code now:} so it can never collide with a
     * persisted {@code pattern_observations} key.
     */
    static List<PatternCandidate> structuredUrgent(Pet pet,
                                                   List<DailyCheckIn> checkIns,
                                                   Predicate<DailyCheckIn> trigger,
                                                   String ruleId,
                                                   String title,
                                                   String summary,
                                                   String urgentNote) {
        LocalDate latest = latestEntry(checkIns);
        if (latest == null) {
            return List.of();
        }
        LocalDate latestMatch = null;
        List<UUID> ids = new ArrayList<>();
        for (DailyCheckIn checkIn : checkIns) {
            LocalDate date = checkIn.getCheckInDate();
            if (date == null || !isCurrent(date, latest) || !trigger.test(checkIn)) {
                continue;
            }
            if (latestMatch == null || date.isAfter(latestMatch)) {
                latestMatch = date;
            }
            if (checkIn.getId() != null) {
                ids.add(checkIn.getId());
            }
        }
        if (latestMatch == null) {
            return List.of();
        }
        return List.of(new PatternCandidate(
                "now:" + pet.getId() + ":" + ruleId,
                pet.getId(),
                PatternType.STARTER_URGENT_SIGN,
                PatternConfidence.MEDIUM,
                title,
                summary,
                List.of(),
                Instant.now(),
                null,
                List.copyOf(ids),
                Severity.URGENT,
                urgentNote));
    }
}
