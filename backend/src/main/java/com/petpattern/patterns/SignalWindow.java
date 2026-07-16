package com.petpattern.patterns;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.petpattern.domain.DailyCheckIn;
import com.petpattern.observations.ObservationSignal;
import com.petpattern.observations.ObservationSignals;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.function.Predicate;

/**
 * A per-day index of parsed observation signals over a recent window, exposing
 * count-and-evidence queries that the starter rules compose.
 *
 * <p>Value matching is case-insensitive against the exact option strings authored in
 * {@code frontend/src/speciesProfiles.js} (e.g. {@code "Eating less"}, {@code "Watery"}) —
 * the backend keeps no enum of signal keys, so the rules and this window are the single
 * place those strings live server-side. Built once per {@code evaluate()} over the last
 * {@link StarterRuleEngine#MAX_WINDOW_DAYS} days and narrowed per-rule with {@link #within(int)}.
 */
public final class SignalWindow {

    /** One check-in day and its parsed signals. */
    public record Day(LocalDate date, UUID checkInId, List<ObservationSignal> signals) {

        /** True if signal {@code key} holds one of the exact option {@code values} on this day. */
        public boolean has(String key, Set<String> values) {
            for (ObservationSignal signal : signals) {
                if (key.equalsIgnoreCase(signal.key()) && valueIn(signal.value(), values)) {
                    return true;
                }
            }
            return false;
        }

        /** True if signal {@code key} holds any "changed" (non-normal) value on this day. */
        public boolean changed(String key) {
            for (ObservationSignal signal : signals) {
                if (key.equalsIgnoreCase(signal.key()) && signal.isChanged()) {
                    return true;
                }
            }
            return false;
        }

        /**
         * True if a visible-change signal of {@code area} (null = any area) is logged this day,
         * optionally restricted to better/same/worse {@code statuses} (null/empty = any status).
         */
        public boolean visibleChange(String area, Set<String> statuses) {
            for (ObservationSignal signal : signals) {
                if (!signal.isVisibleChange()) {
                    continue;
                }
                if (area != null && !area.equalsIgnoreCase(signal.area())) {
                    continue;
                }
                if (statuses == null || statuses.isEmpty()) {
                    return true;
                }
                String status = signal.normalizedStatus();
                if (status != null && containsIgnoreCase(statuses, status)) {
                    return true;
                }
            }
            return false;
        }
    }

    private final List<Day> days;

    private SignalWindow(List<Day> days) {
        this.days = days;
    }

    static SignalWindow build(List<DailyCheckIn> recent, ObjectMapper mapper) {
        List<Day> parsed = new ArrayList<>();
        for (DailyCheckIn checkIn : recent) {
            parsed.add(new Day(
                    checkIn.getCheckInDate(),
                    checkIn.getId(),
                    ObservationSignals.parse(checkIn.getObservationsJson(), mapper)));
        }
        parsed.sort(Comparator.comparing(Day::date, Comparator.nullsFirst(Comparator.naturalOrder())));
        return new SignalWindow(parsed);
    }

    /**
     * A narrower window keeping only the last {@code n} calendar days up to <em>today</em>.
     * Anchoring on the current date (not the latest check-in) is what makes an URGENT rule's
     * "is this happening now?" honest: an old co-occurrence in a pet that stopped logging must
     * fall outside the urgent window even though it is that pet's most recent data.
     */
    public SignalWindow within(int n) {
        LocalDate from = LocalDate.now().minusDays(n - 1L);
        List<Day> kept = new ArrayList<>();
        for (Day day : days) {
            if (day.date() != null && !day.date().isBefore(from)) {
                kept.add(day);
            }
        }
        return new SignalWindow(kept);
    }

    /** Days where signal {@code key} holds one of the exact option {@code values}. */
    public RuleHit daysMatching(String key, Set<String> values) {
        RuleHit hit = new RuleHit();
        for (Day day : days) {
            if (day.has(key, values)) {
                hit.add(day.date(), day.checkInId());
            }
        }
        return hit;
    }

    /** Days where signal {@code key} holds any "changed" (non-normal) value. */
    public RuleHit changedDays(String key) {
        RuleHit hit = new RuleHit();
        for (Day day : days) {
            if (day.changed(key)) {
                hit.add(day.date(), day.checkInId());
            }
        }
        return hit;
    }

    /**
     * Days where BOTH predicates hold on the SAME day — the core new cross-signal
     * capability (e.g. "ate less" AND "fewer droppings" logged together).
     */
    public RuleHit coOccurDays(Predicate<Day> a, Predicate<Day> b) {
        RuleHit hit = new RuleHit();
        for (Day day : days) {
            if (a.test(day) && b.test(day)) {
                hit.add(day.date(), day.checkInId());
            }
        }
        return hit;
    }

    /** Days with a visible-change signal of {@code area} and optional better/same/worse statuses. */
    public RuleHit visibleChangeDays(String area, Set<String> statuses) {
        RuleHit hit = new RuleHit();
        for (Day day : days) {
            if (day.visibleChange(area, statuses)) {
                hit.add(day.date(), day.checkInId());
            }
        }
        return hit;
    }

    /** Every observation key logged as a "changed" value anywhere in the window. */
    public Set<String> changedKeys() {
        Set<String> keys = new LinkedHashSet<>();
        for (Day day : days) {
            for (ObservationSignal signal : day.signals()) {
                if (signal.key() != null && !signal.key().isBlank() && signal.isChanged()) {
                    keys.add(signal.key());
                }
            }
        }
        return keys;
    }

    private static boolean valueIn(String value, Set<String> values) {
        if (value == null) {
            return false;
        }
        String trimmed = value.trim();
        for (String candidate : values) {
            if (candidate.equalsIgnoreCase(trimmed)) {
                return true;
            }
        }
        return false;
    }

    private static boolean containsIgnoreCase(Set<String> set, String value) {
        for (String candidate : set) {
            if (candidate.equalsIgnoreCase(value)) {
                return true;
            }
        }
        return false;
    }

    /** Case-insensitive value-set for readable rule declarations. */
    public static Set<String> values(String... options) {
        Set<String> set = new LinkedHashSet<>();
        for (String option : options) {
            set.add(option.trim());
        }
        return set;
    }

    static String normalizeKey(String key) {
        return key == null ? null : key.trim().toLowerCase(Locale.ROOT);
    }
}
