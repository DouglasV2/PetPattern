package com.petpattern.analytics;

import com.petpattern.api.dto.AnalyticsReportResponse;
import com.petpattern.repository.AnalyticsEventRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.TreeSet;

/**
 * Computes the funnel and D1/D7/D30 retention from stored events. Retention is bucketed by
 * UTC calendar day (the app pins the server TZ to UTC), so day math is timezone-safe: a
 * ref's cohort day is its first event day, and it is "DN-retained" if it has any event on
 * the day exactly N days later. Only cohorts old enough for day N to have fully elapsed are
 * counted, so an in-progress cohort never drags the rate down.
 */
@Service
public class AnalyticsReportService {

    private static final int[] RETENTION_DAYS = {1, 7, 30};

    private final AnalyticsEventRepository repository;

    public AnalyticsReportService(AnalyticsEventRepository repository) {
        this.repository = repository;
    }

    public AnalyticsReportResponse report(LocalDate today) {
        List<AnalyticsEventRepository.FunnelRow> funnelRows = repository.funnel();
        List<AnalyticsReportResponse.FunnelEntry> funnel = funnelRows.stream()
                .map(r -> new AnalyticsReportResponse.FunnelEntry(r.getType(), r.getRefs(), r.getTotal()))
                .sorted((a, b) -> Long.compare(b.distinctUsers(), a.distinctUsers()))
                .toList();

        List<RefDay> refDays = repository.refDays().stream()
                .map(r -> new RefDay(r.getRef(), r.getDay()))
                .toList();

        List<AnalyticsReportResponse.PlatformEntry> platforms = repository.platformBreakdown().stream()
                .map(r -> new AnalyticsReportResponse.PlatformEntry(r.getPlatform(), r.getRefs(), r.getTotal()))
                .sorted((a, b) -> Long.compare(b.distinctUsers(), a.distinctUsers()))
                .toList();

        List<RefDayPlatform> refDayPlatforms = repository.refDayPlatforms().stream()
                .map(r -> new RefDayPlatform(r.getRef(), r.getDay(), r.getPlatform(), r.getAt()))
                .toList();

        return new AnalyticsReportResponse(
                today,
                repository.firstDay(),
                repository.lastDay(),
                repository.count(),
                repository.countDistinctRefs(),
                funnel,
                retention(refDays, today),
                platforms,
                retentionByPlatform(refDayPlatforms, today));
    }

    /** A pseudonymous ref and one UTC day it was active. */
    public record RefDay(String ref, LocalDate day) {
    }

    /** A pseudonymous ref, one UTC day it was active, the event's platform, and its instant. */
    public record RefDayPlatform(String ref, LocalDate day, String platform, Instant at) {
    }

    /**
     * Pure D1/D7/D30 retention over (ref, day) activity. Testable with plain inputs.
     */
    public List<AnalyticsReportResponse.RetentionEntry> retention(List<RefDay> rows, LocalDate today) {
        Map<String, TreeSet<LocalDate>> daysByRef = new HashMap<>();
        for (RefDay row : rows) {
            if (row.ref() == null || row.day() == null) {
                continue;
            }
            daysByRef.computeIfAbsent(row.ref(), k -> new TreeSet<>()).add(row.day());
        }

        List<AnalyticsReportResponse.RetentionEntry> out = new ArrayList<>();
        for (int dayN : RETENTION_DAYS) {
            long cohort = 0;
            long retained = 0;
            for (TreeSet<LocalDate> days : daysByRef.values()) {
                LocalDate cohortDay = days.first();
                // Only count refs whose day-N has fully elapsed, so an in-progress cohort
                // (too new to have reached day N) doesn't deflate the rate.
                if (cohortDay.plusDays(dayN).isAfter(today)) {
                    continue;
                }
                cohort++;
                if (days.contains(cohortDay.plusDays(dayN))) {
                    retained++;
                }
            }
            double rate = cohort == 0 ? 0.0 : (double) retained / cohort;
            out.add(new AnalyticsReportResponse.RetentionEntry(dayN, cohort, retained, round(rate)));
        }
        return out;
    }

    /**
     * Per-platform D1/D7/D30 retention. A ref is attributed to the platform of its EARLIEST event
     * (acquisition platform), then the same cohort math runs within each platform group. Pure over
     * the given rows, so it is testable with plain inputs.
     */
    public List<AnalyticsReportResponse.PlatformRetentionEntry> retentionByPlatform(
            List<RefDayPlatform> rows, LocalDate today) {
        Map<String, TreeSet<LocalDate>> daysByRef = new HashMap<>();
        Map<String, Instant> firstAtByRef = new HashMap<>();
        Map<String, String> platformByRef = new HashMap<>();
        for (RefDayPlatform row : rows) {
            if (row.ref() == null || row.day() == null) {
                continue;
            }
            daysByRef.computeIfAbsent(row.ref(), k -> new TreeSet<>()).add(row.day());
            Instant at = row.at();
            String platform = row.platform() == null ? "web" : row.platform();
            Instant knownFirst = firstAtByRef.get(row.ref());
            // Tie-break a null instant / equal instants deterministically by keeping the first seen.
            if (knownFirst == null || (at != null && at.isBefore(knownFirst))) {
                firstAtByRef.put(row.ref(), at == null ? Instant.EPOCH : at);
                platformByRef.put(row.ref(), platform);
            }
        }

        Map<String, List<String>> refsByPlatform = new TreeMap<>();
        for (Map.Entry<String, String> entry : platformByRef.entrySet()) {
            refsByPlatform.computeIfAbsent(entry.getValue(), k -> new ArrayList<>()).add(entry.getKey());
        }

        List<AnalyticsReportResponse.PlatformRetentionEntry> out = new ArrayList<>();
        for (Map.Entry<String, List<String>> group : refsByPlatform.entrySet()) {
            String platform = group.getKey();
            for (int dayN : RETENTION_DAYS) {
                long cohort = 0;
                long retained = 0;
                for (String ref : group.getValue()) {
                    TreeSet<LocalDate> days = daysByRef.get(ref);
                    LocalDate cohortDay = days.first();
                    if (cohortDay.plusDays(dayN).isAfter(today)) {
                        continue;
                    }
                    cohort++;
                    if (days.contains(cohortDay.plusDays(dayN))) {
                        retained++;
                    }
                }
                double rate = cohort == 0 ? 0.0 : (double) retained / cohort;
                out.add(new AnalyticsReportResponse.PlatformRetentionEntry(
                        platform, dayN, cohort, retained, round(rate)));
            }
        }
        return out;
    }

    private static double round(double value) {
        return Math.round(value * 1000.0) / 1000.0;
    }
}
