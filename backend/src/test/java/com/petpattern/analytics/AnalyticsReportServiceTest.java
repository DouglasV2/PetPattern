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

    // ---- directly-computed funnel metrics (WP6) -----------------------------

    private static AnalyticsReportService.RefTypeFirst first(String ref, String type, String isoInstant) {
        return new AnalyticsReportService.RefTypeFirst(ref, type, Instant.parse(isoInstant));
    }

    @Test
    void stepConversionsCountRefsThatReachedBothMilestones() {
        List<AnalyticsReportService.RefTypeFirst> rows = new ArrayList<>(List.of(
                // R1: registered -> pet_created -> onboarding
                first("R1", "registered", "2026-02-01T10:00:00Z"),
                first("R1", "pet_created", "2026-02-01T10:05:00Z"),
                first("R1", "onboarding_completed", "2026-02-01T10:10:00Z"),
                // R2: registered -> pet_created only (dropped before onboarding)
                first("R2", "registered", "2026-02-02T10:00:00Z"),
                first("R2", "pet_created", "2026-02-02T10:20:00Z"),
                // R3: registered only
                first("R3", "registered", "2026-02-03T10:00:00Z")));

        Map<String, AnalyticsReportResponse.ConversionEntry> byStep = service
                .conversions(service.firstByRef(rows)).stream()
                .collect(java.util.stream.Collectors.toMap(AnalyticsReportResponse.ConversionEntry::from, e -> e));

        AnalyticsReportResponse.ConversionEntry regToPet = byStep.get("registered");
        assertEquals(3, regToPet.fromUsers(), "R1,R2,R3 all registered");
        assertEquals(2, regToPet.toUsers(), "R1,R2 created a pet");
        assertEquals(0.667, regToPet.rate(), 1e-3);

        AnalyticsReportResponse.ConversionEntry petToOnboarding = byStep.get("pet_created");
        assertEquals(2, petToOnboarding.fromUsers());
        assertEquals(1, petToOnboarding.toUsers(), "only R1 completed onboarding");
        assertEquals(0.5, petToOnboarding.rate(), 1e-9);
    }

    @Test
    void timeToFirstCheckInReportsAverageAndMedianSeconds() {
        List<AnalyticsReportService.RefTypeFirst> rows = new ArrayList<>(List.of(
                // deltas: 100s, 200s, 600s -> median 200, average 300
                first("A", "registered", "2026-02-01T00:00:00Z"),
                first("A", "first_checkin_completed", "2026-02-01T00:01:40Z"),
                first("B", "registered", "2026-02-01T00:00:00Z"),
                first("B", "first_checkin_completed", "2026-02-01T00:03:20Z"),
                first("C", "registered", "2026-02-01T00:00:00Z"),
                first("C", "first_checkin_completed", "2026-02-01T00:10:00Z"),
                // D registered but never checked in -> excluded from the sample
                first("D", "registered", "2026-02-01T00:00:00Z")));

        AnalyticsReportResponse.TimingEntry t = service.timings(service.firstByRef(rows)).stream()
                .filter(e -> e.metric().equals("time_to_first_checkin")).findFirst().orElseThrow();
        assertEquals(3, t.sampleSize(), "only A,B,C reached first check-in");
        assertEquals(200.0, t.medianSeconds(), 1e-9);
        assertEquals(300.0, t.averageSeconds(), 1e-9);
    }

    @Test
    void ratesComputeReminderOpenAndNotificationConversion() {
        List<AnalyticsReportResponse.FunnelEntry> funnel = List.of(
                new AnalyticsReportResponse.FunnelEntry("reminder_enabled", 10, 12),
                new AnalyticsReportResponse.FunnelEntry("reminder_notification_opened", 4, 20),
                new AnalyticsReportResponse.FunnelEntry("notification_to_checkin", 3, 5));

        Map<String, AnalyticsReportResponse.RateEntry> byMetric = service.rates(funnel).stream()
                .collect(java.util.stream.Collectors.toMap(AnalyticsReportResponse.RateEntry::metric, e -> e));

        AnalyticsReportResponse.RateEntry open = byMetric.get("reminder_open_rate");
        assertEquals(4, open.numerator());
        assertEquals(10, open.denominator());
        assertEquals(0.4, open.rate(), 1e-9);

        AnalyticsReportResponse.RateEntry conv = byMetric.get("notification_to_checkin_conversion_rate");
        assertEquals(5, conv.numerator(), "conversion uses event totals");
        assertEquals(20, conv.denominator());
        assertEquals(0.25, conv.rate(), 1e-9);
    }

    @Test
    void dateCohortsGroupNewUsersByRegistrationDayAndActivation() {
        List<AnalyticsReportService.RefTypeFirst> rows = new ArrayList<>(List.of(
                first("A", "registered", "2026-02-01T09:00:00Z"),
                first("A", "first_checkin_completed", "2026-02-01T12:00:00Z"),
                first("B", "registered", "2026-02-01T23:00:00Z"),
                // B registered same UTC day, no check-in
                first("C", "registered", "2026-02-02T01:00:00Z"),
                first("C", "first_checkin_completed", "2026-02-05T01:00:00Z")));

        Map<LocalDate, AnalyticsReportResponse.DateCohortEntry> byDay = service
                .dateCohorts(service.firstByRef(rows)).stream()
                .collect(java.util.stream.Collectors.toMap(AnalyticsReportResponse.DateCohortEntry::date, e -> e));

        AnalyticsReportResponse.DateCohortEntry feb1 = byDay.get(LocalDate.of(2026, 2, 1));
        assertEquals(2, feb1.newUsers(), "A,B registered on Feb 1 UTC");
        assertEquals(1, feb1.reachedFirstCheckIn(), "only A activated");
        assertEquals(0.5, feb1.rate(), 1e-9);

        AnalyticsReportResponse.DateCohortEntry feb2 = byDay.get(LocalDate.of(2026, 2, 2));
        assertEquals(1, feb2.newUsers());
        assertEquals(1, feb2.reachedFirstCheckIn());
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
