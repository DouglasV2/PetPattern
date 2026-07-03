package com.petpattern.api;

import com.petpattern.api.dto.VetShareResponse;
import com.petpattern.auth.PetAccess;
import com.petpattern.domain.Pet;
import com.petpattern.vet.VetShareService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Owner-side management of a pet's read-only vet-summary share link.
 *
 * <p>Primary-owner only (like the care circle): a caregiver revoking or rotating
 * the link would silently kill the URL the owner may have already handed to
 * their vet. Caregivers still see the vet summary itself; they just don't
 * manage the link. They get 404 here, so nothing about the link is leaked.
 */
@RestController
@RequestMapping("/api/pets/{petId}/share")
public class VetShareController {

    private final PetAccess petAccess;
    private final VetShareService vetShareService;

    public VetShareController(PetAccess petAccess, VetShareService vetShareService) {
        this.petAccess = petAccess;
        this.vetShareService = vetShareService;
    }

    @GetMapping
    public VetShareResponse status(@PathVariable UUID petId) {
        Pet pet = petAccess.requirePrimaryOwner(petId);
        return vetShareService.activeExpiry(pet)
                .map(expiry -> new VetShareResponse(true, null, expiry))
                .orElse(new VetShareResponse(false, null, null));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public VetShareResponse create(@PathVariable UUID petId) {
        Pet pet = petAccess.requirePrimaryOwner(petId);
        VetShareService.Created created = vetShareService.createOrReplace(pet);
        return new VetShareResponse(true, created.token(), created.expiresAt());
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revoke(@PathVariable UUID petId) {
        Pet pet = petAccess.requirePrimaryOwner(petId);
        vetShareService.revoke(pet);
    }
}
