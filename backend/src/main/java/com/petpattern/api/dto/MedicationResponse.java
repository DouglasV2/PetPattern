package com.petpattern.api.dto;

import com.petpattern.domain.Medication;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record MedicationResponse(
        UUID id,
        String name,
        LocalDate startDate,
        LocalDate endDate,
        boolean ongoing,
        String notes,
        Instant createdAt) {

    public static MedicationResponse from(Medication medication) {
        return new MedicationResponse(
                medication.getId(),
                medication.getName(),
                medication.getStartDate(),
                medication.getEndDate(),
                medication.getEndDate() == null,
                medication.getNotes(),
                medication.getCreatedAt());
    }
}
