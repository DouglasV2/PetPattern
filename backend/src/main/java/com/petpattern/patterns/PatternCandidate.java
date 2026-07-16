package com.petpattern.patterns;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record PatternCandidate(
        String id,
        UUID petId,
        PatternType type,
        PatternConfidence confidence,
        String title,
        String summary,
        List<String> evidence,
        Instant detectedAt,
        UUID relatedFoodLogId,
        List<UUID> relatedCheckInIds,
        Severity severity,
        String urgentNote
) {
    /**
     * Backward-compatible constructor preserving the original 10-argument signature.
     * Every pre-existing call site (the dog, cat and generic-observation analyzers)
     * builds a non-urgent, {@link Severity#WATCH} candidate exactly as before, so no
     * existing behaviour changes when the two urgent-tier fields are added.
     */
    public PatternCandidate(String id,
                            UUID petId,
                            PatternType type,
                            PatternConfidence confidence,
                            String title,
                            String summary,
                            List<String> evidence,
                            Instant detectedAt,
                            UUID relatedFoodLogId,
                            List<UUID> relatedCheckInIds) {
        this(id, petId, type, confidence, title, summary, evidence, detectedAt,
                relatedFoodLogId, relatedCheckInIds, Severity.WATCH, null);
    }
}
