package com.petpattern.api.dto;

import com.petpattern.domain.AppetiteLevel;
import com.petpattern.domain.EnergyLevel;
import com.petpattern.domain.HidingBehavior;
import com.petpattern.domain.LitterBoxUse;
import com.petpattern.domain.StoolState;
import com.petpattern.domain.UrinationChange;
import com.petpattern.domain.WaterLevel;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record CheckInRequest(
        @NotNull LocalDate checkInDate,
        @Min(0) @Max(10) Integer itchingScore,
        StoolState stoolState,
        @Min(1) @Max(5) Integer stoolScore,
        AppetiteLevel appetiteLevel,
        WaterLevel waterLevel,
        EnergyLevel energyLevel,
        boolean vomiting,
        boolean earRedness,
        boolean pawLicking,
        // Matches the 1200-char DB column; without this an oversized note reached
        // the database and surfaced as a 500 that leaked the SQL statement.
        @Size(max = 1200, message = "The note is too long (max 1200 characters)") String freeTextNote,
        @Min(0) @Max(10) Integer energyScore,
        @Min(0) @Max(10) Integer appetiteScore,
        @Min(0) @Max(10) Integer sleepQualityScore,
        @Min(0) @Max(50000) Integer waterIntakeMl,
        boolean diarrhea,
        @Size(max = 1200, message = "The note is too long (max 1200 characters)") String notes,
        // Cat-specific (null/false for dogs)
        LitterBoxUse litterBoxUse,
        UrinationChange urinationChange,
        boolean straining,
        HidingBehavior hidingBehavior,
        boolean weightConcern,
        // Species-specific observations for starter species (BIRD, REPTILE, …) as a
        // JSON string. Optional — dog/cat clients omit it and keep working.
        @Size(max = 8000, message = "Too many observations") String observationsJson
) {
    public LitterBoxUse resolvedLitterBoxUse() {
        return litterBoxUse == null ? LitterBoxUse.UNKNOWN : litterBoxUse;
    }

    public UrinationChange resolvedUrinationChange() {
        return urinationChange == null ? UrinationChange.UNKNOWN : urinationChange;
    }

    public HidingBehavior resolvedHidingBehavior() {
        return hidingBehavior == null ? HidingBehavior.UNKNOWN : hidingBehavior;
    }

    public StoolState resolvedStoolState() {
        if (stoolState != null) {
            return stoolState;
        }
        if (diarrhea) {
            return StoolState.DIARRHEA;
        }
        if (stoolScore == null) {
            return StoolState.UNKNOWN;
        }
        if (stoolScore <= 1) {
            return StoolState.DIARRHEA;
        }
        if (stoolScore == 2) {
            return StoolState.SOFT;
        }
        if (stoolScore <= 4) {
            return StoolState.NORMAL;
        }
        return StoolState.UNKNOWN;
    }

    public Integer resolvedStoolScore() {
        if (stoolScore != null) {
            return stoolScore;
        }
        return switch (resolvedStoolState()) {
            case DIARRHEA -> 1;
            case SOFT -> 2;
            case NORMAL -> 3;
            case NO_STOOL, UNKNOWN -> null;
        };
    }

    public AppetiteLevel resolvedAppetiteLevel() {
        if (appetiteLevel != null) {
            return appetiteLevel;
        }
        if (appetiteScore == null) {
            return AppetiteLevel.UNKNOWN;
        }
        if (appetiteScore <= 1) {
            return AppetiteLevel.REFUSED;
        }
        if (appetiteScore <= 4) {
            return AppetiteLevel.LOWER;
        }
        if (appetiteScore >= 9) {
            return AppetiteLevel.HIGHER;
        }
        return AppetiteLevel.NORMAL;
    }

    public WaterLevel resolvedWaterLevel() {
        if (waterLevel != null) {
            return waterLevel;
        }
        if (waterIntakeMl == null) {
            return WaterLevel.UNKNOWN;
        }
        if (waterIntakeMl < 700) {
            return WaterLevel.LOWER;
        }
        if (waterIntakeMl > 1050) {
            return WaterLevel.HIGHER;
        }
        return WaterLevel.NORMAL;
    }

    public EnergyLevel resolvedEnergyLevel() {
        if (energyLevel != null) {
            return energyLevel;
        }
        if (energyScore == null) {
            return EnergyLevel.UNKNOWN;
        }
        if (energyScore <= 3) {
            return EnergyLevel.LOW;
        }
        if (energyScore >= 9) {
            return EnergyLevel.HIGH;
        }
        return EnergyLevel.NORMAL;
    }

    public String resolvedNote() {
        if (freeTextNote != null && !freeTextNote.isBlank()) {
            return freeTextNote;
        }
        return notes;
    }
}
