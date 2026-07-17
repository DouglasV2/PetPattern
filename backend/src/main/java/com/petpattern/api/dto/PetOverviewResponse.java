package com.petpattern.api.dto;

import java.util.List;

public record PetOverviewResponse(
        PetResponse pet,
        CheckInResponse latestCheckIn,
        FoodLogResponse currentFood,
        List<PatternResponse> patterns,
        String todayStatus,
        String todayExplanation,
        String nextAction,
        RetentionSummary retention,
        String goodNews,
        String watchOut,
        WeeklyInsight weeklyInsight,
        PatternMemoryProgress patternMemory,
        // Immediate, safety-oriented observations from the latest entry (Layer A). Evaluated with
        // no seven-check-in gate, always urgent-tier and non-diagnostic, and never persisted — kept
        // separate from `patterns` (the historical pattern-memory layer) on purpose.
        List<ImmediateObservationDto> immediateObservations
) {
}
