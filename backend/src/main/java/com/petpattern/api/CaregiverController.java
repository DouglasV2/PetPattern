package com.petpattern.api;

import com.petpattern.api.dto.CaregiverResponse;
import com.petpattern.api.dto.CaregiversResponse;
import com.petpattern.api.dto.InviteRequest;
import com.petpattern.api.dto.PendingInviteResponse;
import com.petpattern.auth.PetAccess;
import com.petpattern.caregiver.CaregiverService;
import com.petpattern.domain.Owner;
import com.petpattern.domain.Pet;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Managing a pet's care circle. Inviting and removing are the primary owner's
 * alone ({@code requirePrimaryOwner}); leaving is self-service for a caregiver.
 */
@RestController
@RequestMapping("/api/pets/{petId}")
public class CaregiverController {

    private final PetAccess petAccess;
    private final CaregiverService caregiverService;

    public CaregiverController(PetAccess petAccess, CaregiverService caregiverService) {
        this.petAccess = petAccess;
        this.caregiverService = caregiverService;
    }

    @GetMapping("/caregivers")
    public CaregiversResponse list(@PathVariable UUID petId) {
        Pet pet = petAccess.requirePrimaryOwner(petId);
        return new CaregiversResponse(
                caregiverService.listCaregivers(pet).stream().map(CaregiverResponse::from).toList(),
                caregiverService.listInvites(pet).stream().map(PendingInviteResponse::from).toList());
    }

    @PostMapping("/caregivers/invite")
    @ResponseStatus(HttpStatus.CREATED)
    public PendingInviteResponse invite(@PathVariable UUID petId, @RequestBody InviteRequest request) {
        Owner owner = petAccess.currentOwner();
        Pet pet = petAccess.requirePrimaryOwner(petId);
        return PendingInviteResponse.from(caregiverService.invite(pet, owner, request.email()));
    }

    @DeleteMapping("/caregivers/{caregiverOwnerId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(@PathVariable UUID petId, @PathVariable UUID caregiverOwnerId) {
        Pet pet = petAccess.requirePrimaryOwner(petId);
        caregiverService.removeCaregiver(pet, caregiverOwnerId);
    }

    @DeleteMapping("/invites/{inviteId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancelInvite(@PathVariable UUID petId, @PathVariable UUID inviteId) {
        Pet pet = petAccess.requirePrimaryOwner(petId);
        caregiverService.cancelInvite(pet, inviteId);
    }

    /** A caregiver stepping away from a pet (not the primary owner). */
    @DeleteMapping("/caregivers/me")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void leave(@PathVariable UUID petId) {
        Owner me = petAccess.currentOwner();
        Pet pet = petAccess.requireOwnedPet(petId);
        caregiverService.leave(pet, me);
    }
}
