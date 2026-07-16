package com.petpattern.api.dto;

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
        String confidence,
        String title,
        String summary,
        List<String> evidence,
        Instant detectedAt,
        UUID relatedFoodLogId,
        List<UUID> relatedCheckInIds,
        String status,
        int detectionCount,
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
        int count = observation == null ? 1 : observation.getDetectionCount();
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
                count,
                first,
                last,
                count > 1,
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
                observation.getDetectionCount(),
                observation.getFirstDetectedDate(),
                observation.getLastDetectedDate(),
                observation.getDetectionCount() > 1,
                false,
                daysSince,
                // A settled pattern is no longer being detected, so it is never surfaced
                // as an active urgent sign: a neutral severity, no urgent note.
                "watch",
                null
        );
    }
}
