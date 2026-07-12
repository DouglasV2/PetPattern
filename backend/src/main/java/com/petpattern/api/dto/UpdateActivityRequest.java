package com.petpattern.api.dto;

import com.petpattern.domain.ActivityType;

import java.time.LocalDate;

public record UpdateActivityRequest(ActivityType type, LocalDate occurredDate, String notes) {
}
