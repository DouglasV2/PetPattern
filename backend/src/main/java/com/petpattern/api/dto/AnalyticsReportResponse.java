package com.petpattern.api.dto;

import java.time.LocalDate;
import java.util.List;

/**
 * The internal analytics report: the activation funnel (distinct users per event) plus
 * D1/D7/D30 retention. Aggregate counts only — no pseudonymous refs, no identities.
 */
public record AnalyticsReportResponse(
        LocalDate generatedOn,
        LocalDate firstDay,
        LocalDate lastDay,
        long totalEvents,
        long distinctUsers,
        List<FunnelEntry> funnel,
        List<RetentionEntry> retention
) {

    public record FunnelEntry(String type, long distinctUsers, long totalEvents) {
    }

    public record RetentionEntry(int dayN, long cohortSize, long retained, double rate) {
    }
}
