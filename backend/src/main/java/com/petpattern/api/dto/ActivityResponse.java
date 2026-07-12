package com.petpattern.api.dto;

import com.petpattern.domain.ActivityLog;
import com.petpattern.domain.ActivityType;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record ActivityResponse(UUID id, LocalDate occurredDate, ActivityType type, String notes, Instant createdAt) {
    public static ActivityResponse from(ActivityLog a) {
        return new ActivityResponse(a.getId(), a.getOccurredDate(), a.getType(), a.getNotes(), a.getCreatedAt());
    }
}
