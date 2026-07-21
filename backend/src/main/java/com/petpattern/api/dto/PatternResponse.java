package com.petpattern.api.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.petpattern.domain.PatternObservation;
import com.petpattern.domain.PatternStatus;
import com.petpattern.patterns.PatternCandidate;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

public record PatternResponse(
        String id,
        UUID petId,
        String type,
        // Internal ranking hint only — never a user-facing confidence level
        // (spec Part 12). Kept for server-side sorting; not serialized.
        @JsonIgnore String confidence,
        String title,
        String summary,
        List<String> evidence,
        Instant detectedAt,
        UUID relatedFoodLogId,
        List<UUID> relatedCheckInIds,
        String status,
        // Genuinely separate periods this pattern appeared in (>= 1). Replaces the
        // former engine-run-day detectionCount, which must not read as recurrence.
        int episodeCount,
        LocalDate firstDetectedAt,
        LocalDate lastDetectedAt,
        boolean seenBefore,
        boolean currentlyDetected,
        Integer daysSinceLastSeen,
        String severity,
        String urgentNote
) {
    /** Currently-detected candidate, optionally enriched with its remembered observation. */
    public static PatternResponse from(PatternCandidate candidate, PatternObservation observation) {
        PatternStatus status = observation == null ? PatternStatus.NEW : observation.getStatus();
        int episodes = observation == null ? 1 : observation.getEpisodeCount();
        boolean seenBefore = observation != null && observation.isSeenAcrossSeparatePeriods();
        LocalDate first = observation == null ? null : observation.getFirstDetectedDate();
        LocalDate last = observation == null ? null : observation.getLastDetectedDate();
        return new PatternResponse(
                candidate.id(),
                candidate.petId(),
                candidate.type().name(),
                candidate.confidence().name(),
                candidate.title(),
                candidate.summary(),
                candidate.evidence(),
                candidate.detectedAt(),
                candidate.relatedFoodLogId(),
                candidate.relatedCheckInIds(),
                status.name(),
                episodes,
                first,
                last,
                seenBefore,
                true,
                null,
                candidate.severity().name().toLowerCase(Locale.ROOT),
                candidate.urgentNote()
        );
    }

    /** A remembered pattern the engine is no longer detecting ("settled"). */
    public static PatternResponse fromObservation(UUID petId, PatternObservation observation, LocalDate today) {
        Integer daysSince = observation.getLastDetectedDate() == null
                ? null
                : (int) ChronoUnit.DAYS.between(observation.getLastDetectedDate(), today);
        return new PatternResponse(
                observation.getPatternKey(),
                petId,
                observation.getType(),
                observation.getLastConfidence(),
                observation.getLastTitle(),
                observation.getLastSummary(),
                List.of(),
                null,
                null,
                List.of(),
                observation.getStatus().name(),
                observation.getEpisodeCount(),
                observation.getFirstDetectedDate(),
                observation.getLastDetectedDate(),
                observation.isSeenAcrossSeparatePeriods(),
                false,
                daysSince,
                // A settled pattern is no longer being detected, so it is never surfaced
                // as an active urgent sign: a neutral severity, no urgent note.
                "watch",
                null
        );
    }
}
