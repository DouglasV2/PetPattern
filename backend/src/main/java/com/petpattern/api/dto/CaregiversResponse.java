package com.petpattern.api.dto;

import java.util.List;

/** Everyone with (or pending) access to a pet, for the owner's management view. */
public record CaregiversResponse(List<CaregiverResponse> caregivers, List<PendingInviteResponse> invites) {
}
