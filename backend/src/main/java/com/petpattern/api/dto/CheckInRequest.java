package com.petpattern.api.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record CheckInRequest(
        @NotNull LocalDate checkInDate,
        @Min(1) @Max(5) Integer stoolScore,
        @Min(0) @Max(10) Integer itchingScore,
        @Min(0) @Max(10) Integer energyScore,
        @Min(0) @Max(10) Integer appetiteScore,
        @Min(0) @Max(10) Integer sleepQualityScore,
        @Min(0) Integer waterIntakeMl,
        boolean vomiting,
        boolean diarrhea,
        boolean earRedness,
        String notes
) {
}
