package com.petpattern.api.dto;

import java.util.List;

public record PetOverviewResponse(
        PetResponse pet,
        CheckInResponse latestCheckIn,
        FoodLogResponse currentFood,
        List<PatternResponse> patterns,
        String todayStatus,
        String todayExplanation,
        String nextAction
) {
}
