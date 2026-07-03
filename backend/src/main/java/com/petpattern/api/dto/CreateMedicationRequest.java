package com.petpattern.api.dto;

import java.time.LocalDate;

public record CreateMedicationRequest(String name, LocalDate startDate, LocalDate endDate, String notes) {
}
