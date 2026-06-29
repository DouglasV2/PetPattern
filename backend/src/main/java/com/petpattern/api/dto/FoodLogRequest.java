package com.petpattern.api.dto;

import com.petpattern.domain.FoodKind;
import com.petpattern.domain.Protein;
import jakarta.validation.constraints.Min;

import java.time.LocalDate;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

public record FoodLogRequest(
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
        @Min(0) Integer amountGrams,
        String notes
) {
    public LocalDate resolvedDateStarted() {
        return dateStarted != null ? dateStarted : date;
    }

    public FoodKind resolvedFoodKind() {
        return foodKind == null ? FoodKind.MAIN_FOOD : foodKind;
    }

    public String resolvedProductName() {
        if (productName != null && !productName.isBlank()) {
            return productName;
        }
        return recipeName;
    }

    public Protein resolvedPrimaryProtein() {
        return Protein.from(primaryProtein);
    }

    public Set<Protein> resolvedSecondaryProteins() {
        Set<Protein> proteins = new LinkedHashSet<>();
        if (secondaryProteins != null) {
            secondaryProteins.stream()
                    .map(Protein::from)
                    .filter(protein -> protein != Protein.UNKNOWN)
                    .forEach(proteins::add);
        }
        return proteins;
    }
}
