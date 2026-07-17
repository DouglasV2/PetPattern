package com.petpattern.analytics;

import com.petpattern.api.dto.AnalyticsReportResponse;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

/** Deterministic D1/D7/D30 retention math over (ref, UTC day) activity. */
class AnalyticsReportServiceTest {

    private final AnalyticsReportService service = new AnalyticsReportService(null);

    @Test
    void retentionBucketsByCohortDayAndCountsOnlyElapsedCohorts() {
        LocalDate today = LocalDate.of(2026, 3, 1);
        List<AnalyticsReportService.RefDay> rows = new ArrayList<>();
        // A: first-seen T-1, returned on T (= cohort + 1) -> D1 retained.
        add(rows, "A", today.minusDays(1), today);
        // B: first-seen T-1, never returned -> counted in the D1 cohort, not retained.
        add(rows, "B", today.minusDays(1));
        // C: first-seen today -> day 1 has not elapsed, so C is not in the D1 cohort at all.
        add(rows, "C", today);
        // D: first-seen T-7, returned on T (= cohort + 7) -> D7 retained.
        add(rows, "D", today.minusDays(7), today);
        // E: first-seen T-7, never returned -> D7 cohort, not retained.
        add(rows, "E", today.minusDays(7));

        Map<Integer, AnalyticsReportResponse.RetentionEntry> byDay = service.retention(rows, today).stream()
                .collect(java.util.stream.Collectors.toMap(AnalyticsReportResponse.RetentionEntry::dayN, e -> e));

        AnalyticsReportResponse.RetentionEntry d1 = byDay.get(1);
        assertEquals(4, d1.cohortSize(), "A,B,D,E are old enough for day 1; C is not");
        assertEquals(1, d1.retained(), "only A returned exactly one day after its first day");
        assertEquals(0.25, d1.rate(), 1e-9);

        AnalyticsReportResponse.RetentionEntry d7 = byDay.get(7);
        assertEquals(2, d7.cohortSize(), "only D,E are >= 7 days old");
        assertEquals(1, d7.retained(), "only D returned on day 7");
        assertEquals(0.5, d7.rate(), 1e-9);

        AnalyticsReportResponse.RetentionEntry d30 = byDay.get(30);
        assertEquals(0, d30.cohortSize(), "no cohort is 30 days old yet");
        assertEquals(0.0, d30.rate(), 1e-9);
    }

    private static void add(List<AnalyticsReportService.RefDay> rows, String ref, LocalDate... days) {
        for (LocalDate day : days) {
            rows.add(new AnalyticsReportService.RefDay(ref, day));
        }
    }

    @Test
    void retentionByPlatformAttributesEachRefToItsEarliestPlatform() {
        LocalDate today = LocalDate.of(2026, 3, 1);
        Instant cohortAt = Instant.parse("2026-02-28T00:00:00Z");
        List<AnalyticsReportService.RefDayPlatform> rows = new ArrayList<>();
        // W: first seen on android (T-1), returns on web (T) -> attributed to ANDROID, D1 retained.
        rows.add(new AnalyticsReportService.RefDayPlatform("W", today.minusDays(1), "android", cohortAt));
        rows.add(new AnalyticsReportService.RefDayPlatform("W", today, "web", cohortAt.plusSeconds(86400)));
        // I: first seen on ios (T-1), never returns -> ios D1 cohort, not retained.
        rows.add(new AnalyticsReportService.RefDayPlatform("I", today.minusDays(1), "ios", cohortAt));

        Map<String, AnalyticsReportResponse.PlatformRetentionEntry> d1 = service.retentionByPlatform(rows, today).stream()
                .filter(e -> e.dayN() == 1)
                .collect(java.util.stream.Collectors.toMap(
                        AnalyticsReportResponse.PlatformRetentionEntry::platform, e -> e));

        assertEquals(1, d1.get("android").cohortSize(), "W is attributed to its earliest (android) platform");
        assertEquals(1, d1.get("android").retained(), "W returned exactly one day later");
        assertEquals(1.0, d1.get("android").rate(), 1e-9);
        assertEquals(1, d1.get("ios").cohortSize());
        assertEquals(0, d1.get("ios").retained(), "I never returned");
        assertEquals(0.0, d1.get("ios").rate(), 1e-9);
    }
}
