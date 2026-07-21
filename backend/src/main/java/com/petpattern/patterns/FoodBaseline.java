package com.petpattern.patterns;

import com.petpattern.domain.FoodKind;
import com.petpattern.domain.FoodLog;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/**
 * The persistent-baseline rules for food (spec Part 1), as pure functions over
 * food logs so they are database-free and deterministic.
 *
 * <p>A MAIN_FOOD is a period {@code [dateStarted, endDate)}; when a new main food
 * begins, the previous period is closed at the successor's start date (never
 * deleted). Treats and supplements are point events and never affect the active
 * main food.
 */
public final class FoodBaseline {

    private FoodBaseline() {
    }

    /**
     * Recomputes the endDate of every MAIN_FOOD in the list so each period ends
     * where the next begins; the latest main food stays open (endDate null).
     * Idempotent. Mutates the given logs.
     */
    public static void relinkChain(List<FoodLog> mainFoods) {
        List<FoodLog> ordered = mainFoods.stream()
                .filter(log -> log.getFoodKind() == FoodKind.MAIN_FOOD)
                .sorted(Comparator.comparing(FoodLog::getDateStarted))
                .toList();
        for (int i = 0; i < ordered.size(); i++) {
            LocalDate end = i + 1 < ordered.size() ? ordered.get(i + 1).getDateStarted() : null;
            ordered.get(i).setEndDate(end);
        }
    }

    /**
     * The MAIN_FOOD whose period {@code [start, end)} covers {@code date} — the
     * latest such start. The end date is exclusive, so on a handover day the newer
     * food is the active one.
     */
    public static Optional<FoodLog> activeOn(List<FoodLog> foodLogs, LocalDate date) {
        return foodLogs.stream()
                .filter(log -> log.getFoodKind() == FoodKind.MAIN_FOOD)
                .filter(log -> !log.getDateStarted().isAfter(date))
                .filter(log -> log.getEndDate() == null || date.isBefore(log.getEndDate()))
                .max(Comparator.comparing(FoodLog::getDateStarted));
    }

    /**
     * The pet's current main food: the MAIN_FOOD active today. A treat or
     * supplement logged today — however recent — is never returned here.
     */
    public static Optional<FoodLog> currentMainFood(List<FoodLog> foodLogs, LocalDate today) {
        return activeOn(foodLogs, today);
    }
}
