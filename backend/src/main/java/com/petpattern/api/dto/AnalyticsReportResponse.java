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
        List<PlatformRetentionEntry> retentionByPlatform,
        List<ConversionEntry> conversions,
        List<TimingEntry> timings,
        List<RateEntry> rates,
        List<DateCohortEntry> dateCohorts
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

    /**
     * A directly-computed funnel step conversion: of the {@code fromUsers} who reached {@code from},
     * how many ({@code toUsers}) went on to reach {@code to}, and the resulting {@code rate} (0..1).
     */
    public record ConversionEntry(String from, String to, long fromUsers, long toUsers, double rate) {
    }

    /**
     * Time between two milestones for the refs that reached both, in seconds: how many samples,
     * plus the average and the median (median resists a few very slow outliers).
     */
    public record TimingEntry(String metric, long sampleSize, double averageSeconds, double medianSeconds) {
    }

    /** A simple engagement ratio (e.g. reminder open rate, notification→check-in), numerator/denominator. */
    public record RateEntry(String metric, long numerator, long denominator, double rate) {
    }

    /**
     * A registration-day cohort: how many users registered on {@code date}, and how many of them
     * have since reached their first check-in ({@code rate} = activation for that day's cohort).
     */
    public record DateCohortEntry(LocalDate date, long newUsers, long reachedFirstCheckIn, double rate) {
    }
}
