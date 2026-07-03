package com.petpattern.patterns;

import com.petpattern.domain.DailyCheckIn;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.OptionalDouble;
import java.util.function.ToIntFunction;

@Component
public class BaselineCalculator {

    public List<DailyCheckIn> recentDays(List<DailyCheckIn> checkIns, int days) {
        LocalDate latestDate = latestDate(checkIns);
        LocalDate from = latestDate.minusDays(days - 1L);
        return checkIns.stream()
                .filter(checkIn -> !checkIn.getCheckInDate().isBefore(from))
                .toList();
    }

    public List<DailyCheckIn> baselineBeforeRecentDays(List<DailyCheckIn> checkIns, int baselineDays, int skipRecentDays) {
        LocalDate latestDate = latestDate(checkIns);
        LocalDate end = latestDate.minusDays(skipRecentDays);
        LocalDate start = end.minusDays(baselineDays - 1L);
        return checkIns.stream()
                .filter(checkIn -> !checkIn.getCheckInDate().isBefore(start) && !checkIn.getCheckInDate().isAfter(end))
                .toList();
    }

    public List<DailyCheckIn> between(List<DailyCheckIn> checkIns, LocalDate start, LocalDate end) {
        return checkIns.stream()
                .filter(checkIn -> !checkIn.getCheckInDate().isBefore(start) && !checkIn.getCheckInDate().isAfter(end))
                .toList();
    }

    public OptionalDouble averageItching(List<DailyCheckIn> checkIns) {
        return averageNullable(checkIns, DailyCheckIn::getItchingScore);
    }

    /**
     * Population standard deviation of logged itching scores. Used to make the
     * "above baseline" threshold adapt to each dog: a steady dog needs only a
     * small rise to stand out, a naturally variable dog needs a bigger one.
     */
    public OptionalDouble itchingStandardDeviation(List<DailyCheckIn> checkIns) {
        double[] values = checkIns.stream()
                .map(DailyCheckIn::getItchingScore)
                .filter(Objects::nonNull)
                .mapToDouble(Integer::doubleValue)
                .toArray();
        if (values.length < 2) {
            return OptionalDouble.empty();
        }
        double mean = java.util.Arrays.stream(values).average().orElse(0.0);
        double variance = java.util.Arrays.stream(values)
                .map(value -> (value - mean) * (value - mean))
                .average()
                .orElse(0.0);
        return OptionalDouble.of(Math.sqrt(variance));
    }

    public OptionalDouble averageWaterMl(List<DailyCheckIn> checkIns) {
        return averageNullable(checkIns, DailyCheckIn::getWaterIntakeMl);
    }

    private OptionalDouble averageNullable(List<DailyCheckIn> checkIns, NullableIntField field) {
        return checkIns.stream()
                .map(field::value)
                .filter(Objects::nonNull)
                .mapToInt(Integer::intValue)
                .average();
    }

    private LocalDate latestDate(List<DailyCheckIn> checkIns) {
        return checkIns.stream()
                .map(DailyCheckIn::getCheckInDate)
                .max(LocalDate::compareTo)
                .orElse(LocalDate.now());
    }

    @FunctionalInterface
    private interface NullableIntField {
        Integer value(DailyCheckIn checkIn);
    }
}
