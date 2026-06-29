package com.petpattern.api.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record FoodLogRequest(
        @NotNull LocalDate date,
        String brand,
        String recipeName,
        String primaryProtein,
        @Min(0) Integer amountGrams,
        boolean newFood,
        String notes
) {
}
