package com.petpattern.api;

import com.petpattern.api.dto.MyInviteResponse;
import com.petpattern.api.dto.PetResponse;
import com.petpattern.auth.PetAccess;
import com.petpattern.caregiver.CaregiverService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * The signed-in person's invitations — the consent side of caregiving. You see
 * invites addressed to your email, and choose to accept (become a caregiver) or
 * decline. Nothing happens to your account until you act.
 */
@RestController
@RequestMapping("/api/invites")
public class InviteController {

    private final PetAccess petAccess;
    private final CaregiverService caregiverService;

    public InviteController(PetAccess petAccess, CaregiverService caregiverService) {
        this.petAccess = petAccess;
        this.caregiverService = caregiverService;
    }

    @GetMapping
    public List<MyInviteResponse> mine() {
        return caregiverService.myInvites(petAccess.currentOwner()).stream()
                .map(MyInviteResponse::from)
                .toList();
    }

    @PostMapping("/{inviteId}/accept")
    public PetResponse accept(@PathVariable UUID inviteId) {
        return PetResponse.from(caregiverService.accept(petAccess.currentOwner(), inviteId));
    }

    @PostMapping("/{inviteId}/decline")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void decline(@PathVariable UUID inviteId) {
        caregiverService.decline(petAccess.currentOwner(), inviteId);
    }
}
