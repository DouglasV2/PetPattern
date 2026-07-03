package com.petpattern.api.dto;

import java.time.LocalDate;

/**
 * Start an elimination trial. Either {@code weeks} (with an optional
 * {@code startDate}) or an explicit {@code targetEndDate} may be supplied;
 * the controller fills in sensible defaults.
 */
public record CreateFoodTrialRequest(
        String protein,
        Integer weeks,
        LocalDate startDate,
        LocalDate targetEndDate,
        String notes) {
}
