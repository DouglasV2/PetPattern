package com.petpattern.api.dto;

import com.petpattern.domain.Sex;
import com.petpattern.domain.Species;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record PetCreateRequest(
        @NotBlank @Size(max = 120, message = "That name is too long") String name,
        @NotNull Species species,
        @Size(max = 120, message = "That breed name is too long") String breed,
        LocalDate birthDate,
        Sex sex,
        // Weight is optional context — but it must be a physically possible number
        // (the DB column also caps at precision 6, scale 2).
        @Positive(message = "Weight must be a positive number")
        @DecimalMax(value = "999.99", message = "That weight doesn't look right") BigDecimal currentWeightKg
) {
}
