package com.petpattern.api.dto;

import com.petpattern.domain.FoodLog;

import java.time.LocalDate;
import java.util.UUID;

public record FoodLogResponse(
        UUID id,
        LocalDate date,
        String brand,
        String recipeName,
        String primaryProtein,
        Integer amountGrams,
        boolean newFood,
        String notes
) {
    public static FoodLogResponse from(FoodLog foodLog) {
        return new FoodLogResponse(
                foodLog.getId(),
                foodLog.getDate(),
                foodLog.getBrand(),
                foodLog.getRecipeName(),
                foodLog.getPrimaryProtein(),
                foodLog.getAmountGrams(),
                foodLog.isNewFood(),
                foodLog.getNotes()
        );
    }
}
