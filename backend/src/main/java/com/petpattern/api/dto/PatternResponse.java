package com.petpattern.api.dto;

import com.petpattern.patterns.PatternCandidate;

import java.time.Instant;
import java.util.List;
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
        List<UUID> relatedCheckInIds
) {
    public static PatternResponse from(PatternCandidate candidate) {
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
                candidate.relatedCheckInIds()
        );
    }
}
