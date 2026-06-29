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
        BigDecimal currentWeightKg
) {
    public static PetResponse from(Pet pet) {
        return new PetResponse(
                pet.getId(),
                pet.getName(),
                pet.getSpecies(),
                pet.getBreed(),
                pet.getBirthDate(),
                pet.getSex(),
                pet.getCurrentWeightKg()
        );
    }
}
