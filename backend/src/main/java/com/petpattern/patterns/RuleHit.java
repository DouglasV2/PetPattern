package com.petpattern.patterns;

import java.time.LocalDate;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.SortedSet;
import java.util.TreeSet;
import java.util.UUID;

/**
 * The days a starter rule matched, with the check-in ids that back them. Days are
 * de-duplicated (a rule counts a calendar day at most once) so {@link #days()} is an
 * honest "on how many separate days did the owner log this".
 */
public final class RuleHit {

    private final SortedSet<LocalDate> days = new TreeSet<>();
    private final LinkedHashSet<UUID> checkInIds = new LinkedHashSet<>();

    void add(LocalDate day, UUID checkInId) {
        if (day != null) {
            days.add(day);
        }
        if (checkInId != null) {
            checkInIds.add(checkInId);
        }
    }

    /** Number of distinct calendar days the rule matched. */
    public int days() {
        return days.size();
    }

    /** True once the rule has matched on at least {@code minDays} distinct days. */
    public boolean fired(int minDays) {
        return days.size() >= minDays;
    }

    /** The backing check-in ids, in insertion order — evidence for the candidate. */
    public List<UUID> checkInIds() {
        return List.copyOf(checkInIds);
    }

    /** Most recent matched day, or {@code null} if the rule never matched. */
    public LocalDate latestDay() {
        return days.isEmpty() ? null : days.last();
    }

    /** Union with another hit (distinct days and ids), for OR-of-sources rules. */
    public RuleHit union(RuleHit other) {
        RuleHit merged = new RuleHit();
        merged.days.addAll(this.days);
        merged.days.addAll(other.days);
        merged.checkInIds.addAll(this.checkInIds);
        merged.checkInIds.addAll(other.checkInIds);
        return merged;
    }
}
