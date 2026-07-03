package com.petpattern.api.dto;

import com.petpattern.domain.PetCaregiver;

import java.time.Instant;
import java.util.UUID;

/** A person who currently has access to a pet (owner-facing management view). */
public record CaregiverResponse(UUID ownerId, String email, String displayName, Instant addedAt) {
    public static CaregiverResponse from(PetCaregiver caregiver) {
        return new CaregiverResponse(
                caregiver.getCaregiver().getId(),
                caregiver.getCaregiver().getEmail(),
                caregiver.getCaregiver().getDisplayName(),
                caregiver.getAddedAt());
    }
}
