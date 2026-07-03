package com.petpattern.ai;

import com.petpattern.domain.AppetiteLevel;
import com.petpattern.domain.EnergyLevel;
import com.petpattern.domain.FoodKind;
import com.petpattern.domain.Protein;
import com.petpattern.domain.StoolState;
import com.petpattern.domain.WaterLevel;

import java.util.List;

/**
 * Structured fields suggested from an owner's free-text note.
 *
 * <p>This is a <em>suggestion</em> only. Nothing here is saved automatically;
 * the owner must review and confirm before a check-in or food log is created.
 * Unknown fields are returned as {@code UNKNOWN}/{@code null} rather than guessed.
 */
public record DailyNoteExtractionResult(
        Integer itchingScore,
        StoolState stoolState,
        AppetiteLevel appetiteLevel,
        WaterLevel waterLevel,
        EnergyLevel energyLevel,
        boolean vomiting,
        Boolean earRedness,
        PossibleFoodTrigger possibleFoodTrigger,
        String confidence,
        List<String> warnings
) {

    public record PossibleFoodTrigger(
            FoodKind foodKind,
            Protein primaryProtein,
            String description
    ) {
    }
}
