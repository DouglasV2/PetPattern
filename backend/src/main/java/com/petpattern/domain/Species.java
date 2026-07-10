package com.petpattern.domain;

/**
 * The pet types PetPattern tracks. DOG and CAT have full, first-class support
 * (explicit check-in columns). The rest have honest "starter" support: their
 * species-specific signals are stored in {@code DailyCheckIn.observationsJson}
 * (a flexible, owner-observed model) rather than dozens of new columns.
 *
 * <p>Keep this in sync with the {@code pets_species_check} constraint (see the
 * V11 migration) and the frontend SPECIES_PROFILES config.
 */
public enum Species {
    DOG,
    CAT,
    RABBIT,
    HAMSTER,
    GUINEA_PIG,
    BIRD,
    REPTILE,
    TURTLE,
    FISH_AQUARIUM,
    OTHER_SMALL_PET;

    /** DOG and CAT are the deeply-supported species with explicit columns. */
    public boolean isFullSupport() {
        return this == DOG || this == CAT;
    }
}
