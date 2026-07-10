package com.petpattern.ai;

import com.petpattern.domain.AppetiteLevel;
import com.petpattern.domain.EnergyLevel;
import com.petpattern.domain.FoodKind;
import com.petpattern.domain.HidingBehavior;
import com.petpattern.domain.LitterBoxUse;
import com.petpattern.domain.Protein;
import com.petpattern.domain.StoolState;
import com.petpattern.domain.UrinationChange;
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
        // Cat-specific signals (null/UNKNOWN for dogs, or when the note doesn't say).
        LitterBoxUse litterBoxUse,
        UrinationChange urinationChange,
        Boolean straining,
        HidingBehavior hidingBehavior,
        Boolean weightConcern,
        PossibleFoodTrigger possibleFoodTrigger,
        String confidence,
        List<String> warnings,
        // Species-neutral signals for starter species (RABBIT, BIRD, …), where the
        // AI returns owner-observed changes by key rather than mapping to a
        // first-class column. Empty for dog/cat, which use the fields above.
        List<DetectedSignal> detectedSignals,
        // Optional care/environment change for the Environment Detective species
        // (BIRD, REPTILE, TURTLE, FISH_AQUARIUM). Null when none is mentioned.
        PossibleEnvironmentTrigger possibleEnvironmentTrigger
) {

    public record PossibleFoodTrigger(
            FoodKind foodKind,
            Protein primaryProtein,
            String description
    ) {
    }

    /** One owner-observed signal for a starter species — never a diagnosis. */
    public record DetectedSignal(
            String key,
            String label,
            String value,
            String severity,
            String confidence
    ) {
    }

    public record PossibleEnvironmentTrigger(
            String description,
            String confidence
    ) {
    }
}
