package com.petpattern.api.dto;

import com.petpattern.domain.PetInvite;

import java.time.Instant;
import java.util.UUID;

/** A pending invite the owner has sent (owner-facing management view). */
public record PendingInviteResponse(UUID id, String email, Instant createdAt, Instant expiresAt) {
    public static PendingInviteResponse from(PetInvite invite) {
        return new PendingInviteResponse(
                invite.getId(),
                invite.getInvitedEmail(),
                invite.getCreatedAt(),
                invite.getExpiresAt());
    }
}
