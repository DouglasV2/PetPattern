package com.petpattern.api.dto;

import java.time.LocalDate;
import java.util.List;

/**
 * A periodic "look back" over the last N days — what was logged, how things
 * trended, what the owner did, and the milestones reached. Warm and honest,
 * never diagnostic.
 */
public record RecapResponse(
        PetResponse pet,
        LocalDate rangeStart,
        LocalDate rangeEnd,
        int days,
        int daysLogged,
        String headline,
        ItchingTrend itching,
        int calmestStreakDays,
        int foodChanges,
        int photosAdded,
        int trialsRun,
        int patternsActive,
        int totalLoggedDays,
        List<Milestone> milestones) {

    public record ItchingTrend(Double recentAvg, Double priorAvg, Double delta, String label) {
    }

    public record Milestone(String label, String detail) {
    }
}
