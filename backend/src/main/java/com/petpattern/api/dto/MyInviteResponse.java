package com.petpattern.api.dto;

import com.petpattern.domain.Owner;
import com.petpattern.domain.PetInvite;

import java.time.Instant;
import java.util.UUID;

/** An invite waiting for the signed-in person to accept or decline. */
public record MyInviteResponse(UUID id, String petName, String invitedByName, Instant createdAt) {
    public static MyInviteResponse from(PetInvite invite) {
        Owner by = invite.getInvitedBy();
        String name = by.getDisplayName() != null && !by.getDisplayName().isBlank()
                ? by.getDisplayName()
                : by.getEmail();
        return new MyInviteResponse(invite.getId(), invite.getPet().getName(), name, invite.getCreatedAt());
    }
}
