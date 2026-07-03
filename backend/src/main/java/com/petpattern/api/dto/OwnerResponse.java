package com.petpattern.api.dto;

import com.petpattern.domain.Owner;

import java.util.UUID;

public record OwnerResponse(UUID id, String email, String displayName) {
    public static OwnerResponse from(Owner owner) {
        return new OwnerResponse(owner.getId(), owner.getEmail(), owner.getDisplayName());
    }
}
