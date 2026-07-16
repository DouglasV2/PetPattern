package com.petpattern.api.dto;

import java.time.LocalDate;
import java.util.List;

/**
 * The "What changed before this?" view for one possible pattern.
 *
 * <p>This is the product's core aha moment: it stitches food changes and daily
 * signals into a short timeline so an owner can feel "maybe this is not random"
 * without the app ever claiming a diagnosis.
 */
public record PatternTimelineDto(
        String patternId,
        String patternType,
        String title,
        String subtitle,
        String patternTitle,
        String confidence,
        String summary,
        String ownerExplanation,
        LocalDate windowStart,
        LocalDate windowEnd,
        List<PatternTimelineEventDto> events,
        boolean empty,
        String emptyMessage,
        String medicalDisclaimer,
        String severity,
        String urgentNote
) {
}
