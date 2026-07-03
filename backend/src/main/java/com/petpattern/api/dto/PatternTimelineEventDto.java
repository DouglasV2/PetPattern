package com.petpattern.api.dto;

import java.time.LocalDate;
import java.util.UUID;

/**
 * A single moment in a pattern's story. Events are intentionally sparse: they
 * mark a change worth noticing (food started, stool softened, scratching rose),
 * not every logged day. That is what makes the timeline read like a story
 * instead of a raw table.
 */
public record PatternTimelineEventDto(
        LocalDate date,
        String type,
        String title,
        String summary,
        String severity,
        String relatedEntityType,
        UUID relatedEntityId
) {
}
