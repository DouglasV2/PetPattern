package com.petpattern.patterns;

import com.petpattern.domain.ActivityLog;
import com.petpattern.domain.ActivityType;
import com.petpattern.domain.DailyCheckIn;
import com.petpattern.domain.Pet;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * Day-level activity<->scratching co-occurrence. The data is date-only with
 * multiple activities allowed per day, so we deliberately do NOT infer ordering
 * or attribute a symptom to a specific activity. We collapse activities to
 * distinct exposure DAYS per type, and count exposure days where scratching was
 * logged that day or the next — matching each symptom day to at most one exposure
 * day (same-day preferred) so overlapping windows never double-count.
 */
@Component
public class ActivityExposureAnalyzer {

    static final int MIN_EXPOSURE_DAYS = 3;
    static final int LOOKBACK_DAYS = 30;
    static final int MAX_RECENT = 8;
    static final int ITCH_PRESENT = 4;

    public Optional<ActivityCoOccurrence> scratchingAroundActivity(
            Pet pet, List<DailyCheckIn> checkIns, List<ActivityLog> activities) {
        if (activities.isEmpty()) {
            return Optional.empty();
        }
        LocalDate today = LocalDate.now();
        LocalDate from = today.minusDays(LOOKBACK_DAYS - 1L);

        Set<LocalDate> scratchingDays = new HashSet<>();
        for (DailyCheckIn c : checkIns) {
            boolean scratching = (c.getItchingScore() != null && c.getItchingScore() >= ITCH_PRESENT) || c.isPawLicking();
            if (scratching) {
                scratchingDays.add(c.getCheckInDate());
            }
        }

        ActivityCoOccurrence best = null;
        for (ActivityType type : ActivityType.values()) {
            List<LocalDate> exposureDays = activities.stream()
                    .filter(a -> a.getType() == type)
                    .map(ActivityLog::getOccurredDate)
                    .filter(d -> !d.isBefore(from) && !d.isAfter(today))
                    .distinct()
                    .sorted(Comparator.reverseOrder())
                    .limit(MAX_RECENT)
                    .toList();
            if (exposureDays.size() < MIN_EXPOSURE_DAYS) {
                continue;
            }

            Set<LocalDate> usedSymptomDays = new HashSet<>();
            Set<LocalDate> hitExposureDays = new HashSet<>();
            // Pass 1: same-day match (preferred).
            for (LocalDate d : exposureDays) {
                if (scratchingDays.contains(d) && !usedSymptomDays.contains(d)) {
                    usedSymptomDays.add(d);
                    hitExposureDays.add(d);
                }
            }
            // Pass 2: next-day match for exposure days not yet matched.
            for (LocalDate d : exposureDays) {
                if (hitExposureDays.contains(d)) {
                    continue;
                }
                LocalDate next = d.plusDays(1);
                if (scratchingDays.contains(next) && !usedSymptomDays.contains(next)) {
                    usedSymptomDays.add(next);
                    hitExposureDays.add(d);
                }
            }

            int k = hitExposureDays.size();
            int n = exposureDays.size();
            if (k >= MIN_EXPOSURE_DAYS && k * 2 >= n && (best == null || k > best.coOccurrenceDays())) {
                best = new ActivityCoOccurrence(type, k, n);
            }
        }
        return Optional.ofNullable(best);
    }

    public record ActivityCoOccurrence(ActivityType type, int coOccurrenceDays, int exposureDays) {
    }
}
