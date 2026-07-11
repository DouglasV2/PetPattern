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
