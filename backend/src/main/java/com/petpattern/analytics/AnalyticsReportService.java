package com.petpattern.analytics;

import com.petpattern.api.dto.AnalyticsReportResponse;
import com.petpattern.repository.AnalyticsEventRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collections;
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

    // Wire names of the funnel milestones the directly-computed metrics below key off of.
    private static final String REGISTERED = "registered";
    private static final String PET_CREATED = "pet_created";
    private static final String ONBOARDING = "onboarding_completed";
    private static final String FIRST_CHECKIN = "first_checkin_completed";
    private static final String THIRD_CHECKIN = "third_useful_checkin";
    private static final String SEVENTH_CHECKIN = "seventh_useful_checkin";
    private static final String FIRST_WEEKLY = "first_weekly_overview";
    private static final String FIRST_PATTERN = "first_pattern_generated";
    private static final String REMINDER_ENABLED = "reminder_enabled";
    private static final String REMINDER_OPENED = "reminder_notification_opened";
    private static final String NOTIF_TO_CHECKIN = "notification_to_checkin";

    /** The activation funnel, in order, as (from -> to) step conversions. */
    private static final String[][] CONVERSION_STEPS = {
            {REGISTERED, PET_CREATED},
            {PET_CREATED, ONBOARDING},
            {ONBOARDING, FIRST_CHECKIN},
            {FIRST_CHECKIN, THIRD_CHECKIN},
            {THIRD_CHECKIN, SEVENTH_CHECKIN}
    };

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

        List<RefTypeFirst> firsts = repository.refTypeFirsts().stream()
                .map(r -> new RefTypeFirst(r.getRef(), r.getType(), r.getAt()))
                .toList();
        Map<String, Map<String, Instant>> firstByRef = firstByRef(firsts);

        return new AnalyticsReportResponse(
                today,
                repository.firstDay(),
                repository.lastDay(),
                repository.count(),
                repository.countDistinctRefs(),
                funnel,
                retention(refDays, today),
                platforms,
                retentionByPlatform(refDayPlatforms, today),
                conversions(firstByRef),
                timings(firstByRef),
                rates(funnel),
                dateCohorts(firstByRef));
    }

    /** A pseudonymous ref and one UTC day it was active. */
    public record RefDay(String ref, LocalDate day) {
    }

    /** A pseudonymous ref, an event type, and the FIRST instant that ref hit that type. */
    public record RefTypeFirst(String ref, String type, Instant at) {
    }

    /** Collapse the per-(ref,type) firsts into ref -> (type -> first instant). Pure/testable. */
    public Map<String, Map<String, Instant>> firstByRef(List<RefTypeFirst> rows) {
        Map<String, Map<String, Instant>> out = new HashMap<>();
        for (RefTypeFirst row : rows) {
            if (row.ref() == null || row.type() == null) {
                continue;
            }
            out.computeIfAbsent(row.ref(), k -> new HashMap<>()).put(row.type(), row.at());
        }
        return out;
    }

    /**
     * Directly-computed funnel step conversions: for each (from -> to) step, how many refs reached
     * {@code from} and how many of those also reached {@code to}. Pure over the given map.
     */
    public List<AnalyticsReportResponse.ConversionEntry> conversions(Map<String, Map<String, Instant>> firstByRef) {
        List<AnalyticsReportResponse.ConversionEntry> out = new ArrayList<>();
        for (String[] step : CONVERSION_STEPS) {
            String from = step[0];
            String to = step[1];
            long fromUsers = 0;
            long toUsers = 0;
            for (Map<String, Instant> types : firstByRef.values()) {
                if (types.containsKey(from)) {
                    fromUsers++;
                    if (types.containsKey(to)) {
                        toUsers++;
                    }
                }
            }
            double rate = fromUsers == 0 ? 0.0 : (double) toUsers / fromUsers;
            out.add(new AnalyticsReportResponse.ConversionEntry(from, to, fromUsers, toUsers, round(rate)));
        }
        return out;
    }

    /**
     * Time-to-milestone metrics, measured from registration: for each ref that reached both
     * registration and the target milestone, the delta in seconds, summarized as average + median
     * (median is reported because a handful of very slow users would otherwise skew the average).
     * Pure over the given map.
     */
    public List<AnalyticsReportResponse.TimingEntry> timings(Map<String, Map<String, Instant>> firstByRef) {
        List<AnalyticsReportResponse.TimingEntry> out = new ArrayList<>();
        out.add(timing("time_to_first_checkin", REGISTERED, FIRST_CHECKIN, firstByRef));
        out.add(timing("time_to_first_weekly_overview", REGISTERED, FIRST_WEEKLY, firstByRef));
        out.add(timing("time_to_first_pattern", REGISTERED, FIRST_PATTERN, firstByRef));
        return out;
    }

    private static AnalyticsReportResponse.TimingEntry timing(
            String metric, String from, String to, Map<String, Map<String, Instant>> firstByRef) {
        List<Long> deltas = new ArrayList<>();
        for (Map<String, Instant> types : firstByRef.values()) {
            Instant start = types.get(from);
            Instant end = types.get(to);
            if (start != null && end != null && !end.isBefore(start)) {
                deltas.add(end.getEpochSecond() - start.getEpochSecond());
            }
        }
        if (deltas.isEmpty()) {
            return new AnalyticsReportResponse.TimingEntry(metric, 0, 0.0, 0.0);
        }
        Collections.sort(deltas);
        double avg = deltas.stream().mapToLong(Long::longValue).average().orElse(0.0);
        int n = deltas.size();
        double median = (n % 2 == 1)
                ? deltas.get(n / 2)
                : (deltas.get(n / 2 - 1) + deltas.get(n / 2)) / 2.0;
        return new AnalyticsReportResponse.TimingEntry(metric, n, round(avg), round(median));
    }

    /**
     * Engagement rates derived from the funnel: reminder open rate (users who opened a reminder /
     * users who enabled reminders) and notification→check-in conversion (conversion events / opened
     * events). Pure over the given funnel entries.
     */
    public List<AnalyticsReportResponse.RateEntry> rates(List<AnalyticsReportResponse.FunnelEntry> funnel) {
        Map<String, AnalyticsReportResponse.FunnelEntry> byType = new HashMap<>();
        for (AnalyticsReportResponse.FunnelEntry e : funnel) {
            byType.put(e.type(), e);
        }
        long enabledUsers = distinctUsers(byType, REMINDER_ENABLED);
        long openedUsers = distinctUsers(byType, REMINDER_OPENED);
        long openedEvents = totalEvents(byType, REMINDER_OPENED);
        long convEvents = totalEvents(byType, NOTIF_TO_CHECKIN);

        List<AnalyticsReportResponse.RateEntry> out = new ArrayList<>();
        out.add(new AnalyticsReportResponse.RateEntry("reminder_open_rate", openedUsers, enabledUsers,
                enabledUsers == 0 ? 0.0 : round((double) openedUsers / enabledUsers)));
        out.add(new AnalyticsReportResponse.RateEntry("notification_to_checkin_conversion_rate", convEvents, openedEvents,
                openedEvents == 0 ? 0.0 : round((double) convEvents / openedEvents)));
        return out;
    }

    private static long distinctUsers(Map<String, AnalyticsReportResponse.FunnelEntry> byType, String type) {
        AnalyticsReportResponse.FunnelEntry e = byType.get(type);
        return e == null ? 0 : e.distinctUsers();
    }

    private static long totalEvents(Map<String, AnalyticsReportResponse.FunnelEntry> byType, String type) {
        AnalyticsReportResponse.FunnelEntry e = byType.get(type);
        return e == null ? 0 : e.totalEvents();
    }

    /**
     * Registration-date cohorts: for each UTC day, how many refs registered that day and how many of
     * them have since reached their first check-in. Pure over the given map.
     */
    public List<AnalyticsReportResponse.DateCohortEntry> dateCohorts(Map<String, Map<String, Instant>> firstByRef) {
        Map<LocalDate, long[]> byDay = new TreeMap<>(); // day -> [newUsers, reachedFirstCheckIn]
        for (Map<String, Instant> types : firstByRef.values()) {
            Instant registered = types.get(REGISTERED);
            if (registered == null) {
                continue;
            }
            LocalDate day = registered.atZone(ZoneOffset.UTC).toLocalDate();
            long[] counts = byDay.computeIfAbsent(day, k -> new long[2]);
            counts[0]++;
            if (types.containsKey(FIRST_CHECKIN)) {
                counts[1]++;
            }
        }
        List<AnalyticsReportResponse.DateCohortEntry> out = new ArrayList<>();
        for (Map.Entry<LocalDate, long[]> entry : byDay.entrySet()) {
            long newUsers = entry.getValue()[0];
            long reached = entry.getValue()[1];
            double rate = newUsers == 0 ? 0.0 : (double) reached / newUsers;
            out.add(new AnalyticsReportResponse.DateCohortEntry(entry.getKey(), newUsers, reached, round(rate)));
        }
        return out;
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
