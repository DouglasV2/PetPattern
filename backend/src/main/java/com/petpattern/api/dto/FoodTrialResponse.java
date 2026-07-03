package com.petpattern.api.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * A food-elimination trial with its computed before/during/after result.
 */
public record FoodTrialResponse(
        UUID id,
        String protein,
        String proteinLabel,
        String status,
        String phase,
        LocalDate startDate,
        LocalDate targetEndDate,
        LocalDate reintroducedDate,
        LocalDate completedDate,
        String notes,
        int dayOfTrial,
        int totalDays,
        Integer daysLeft,
        TrialResult result,
        Instant createdAt) {

    public record TrialResult(
            boolean hasEnoughData,
            WindowStats baseline,
            WindowStats elimination,
            WindowStats reintroduction,
            Double itchingDelta,
            boolean cleanRun,
            int slipCount,
            List<String> slips,
            String verdict) {
    }

    public record WindowStats(
            LocalDate start,
            LocalDate end,
            int loggedDays,
            Double avgItching,
            int unstableStoolDays) {
    }
}
