package com.petpattern.api.dto;

import java.time.LocalDate;
import java.util.List;

/**
 * The internal analytics report: the activation funnel (distinct users per event), overall
 * D1/D7/D30 retention, and platform attribution (per-platform activity + per-platform retention).
 * Aggregate counts only — no pseudonymous refs, no identities.
 */
public record AnalyticsReportResponse(
        LocalDate generatedOn,
        LocalDate firstDay,
        LocalDate lastDay,
        long totalEvents,
        long distinctUsers,
        List<FunnelEntry> funnel,
        List<RetentionEntry> retention,
        List<PlatformEntry> platforms,
        List<PlatformRetentionEntry> retentionByPlatform
) {

    public record FunnelEntry(String type, long distinctUsers, long totalEvents) {
    }

    public record RetentionEntry(int dayN, long cohortSize, long retained, double rate) {
    }

    /** Distinct users + total events attributed to each platform (web / android / ios). */
    public record PlatformEntry(String platform, long distinctUsers, long totalEvents) {
    }

    /** D1/D7/D30 retention within a platform cohort (a ref's platform = its earliest event's). */
    public record PlatformRetentionEntry(String platform, int dayN, long cohortSize, long retained, double rate) {
    }
}
