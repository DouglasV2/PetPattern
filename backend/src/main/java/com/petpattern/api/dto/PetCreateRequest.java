package com.petpattern.api.dto;

import com.petpattern.domain.Sex;
import com.petpattern.domain.Species;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public record PetCreateRequest(
        @NotBlank String name,
        @NotNull Species species,
        String breed,
        LocalDate birthDate,
        Sex sex,
        BigDecimal currentWeightKg
) {
}
