package com.petpattern.api.dto;

import com.petpattern.domain.FoodKind;
import com.petpattern.domain.FoodLog;
import com.petpattern.domain.Protein;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record FoodLogResponse(
        UUID id,
        LocalDate dateStarted,
        LocalDate date,
        FoodKind foodKind,
        String brand,
        String productName,
        String recipeName,
        String primaryProtein,
        List<String> secondaryProteins,
        boolean grainFree,
        boolean newFood,
        Integer amountGrams,
        String notes
) {
    public static FoodLogResponse from(FoodLog foodLog) {
        return new FoodLogResponse(
                foodLog.getId(),
                foodLog.getDateStarted(),
                foodLog.getDateStarted(),
                foodLog.getFoodKind(),
                foodLog.getBrand(),
                foodLog.getProductName(),
                foodLog.getProductName(),
                foodLog.getPrimaryProtein() == null ? Protein.UNKNOWN.name() : foodLog.getPrimaryProtein().name(),
                foodLog.getSecondaryProteins().stream().map(Protein::name).toList(),
                foodLog.isGrainFree(),
                foodLog.isNewFood(),
                foodLog.getAmountGrams(),
                foodLog.getNotes()
        );
    }
}
