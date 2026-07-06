package com.petpattern.api.dto;

import com.petpattern.domain.Pet;
import com.petpattern.domain.Sex;
import com.petpattern.domain.Species;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record PetResponse(
        UUID id,
        String name,
        Species species,
        String breed,
        LocalDate birthDate,
        Sex sex,
        BigDecimal currentWeightKg,
        // True when the signed-in owner owns this pet (vs. a pet shared with them
        // as a caregiver). Only owned pets can be deleted; the UI hides delete for
        // shared ones.
        boolean owned,
        // URL of a small thumbnail of the pet's most-recent photo, for the sidebar
        // avatar. Null when the pet has no photo (the UI shows an initials placeholder).
        String avatarImageUrl
) {
    public static PetResponse from(Pet pet) {
        return from(pet, true, null);
    }

    public static PetResponse from(Pet pet, boolean owned) {
        return from(pet, owned, null);
    }

    public static PetResponse from(Pet pet, boolean owned, String avatarImageUrl) {
        return new PetResponse(
                pet.getId(),
                pet.getName(),
                pet.getSpecies(),
                pet.getBreed(),
                pet.getBirthDate(),
                pet.getSex(),
                pet.getCurrentWeightKg(),
                owned,
                avatarImageUrl
        );
    }
}
