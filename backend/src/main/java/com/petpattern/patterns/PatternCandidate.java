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
        List<UUID> relatedCheckInIds
) {
}
