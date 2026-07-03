package com.petpattern.auth;

import com.petpattern.domain.Owner;
import com.petpattern.domain.Pet;
import com.petpattern.repository.PetCaregiverRepository;
import com.petpattern.repository.PetRepository;
import com.petpattern.i18n.Copy;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

/**
 * Single choke-point for owner authentication and pet access. Every pet-scoped
 * endpoint resolves its pet through here, so one owner can never read or touch a
 * pet they have no relationship with (no IDOR).
 *
 * <p>Two levels of access:
 * <ul>
 *   <li>{@link #requireOwnedPet} — the primary owner <em>or</em> any accepted
 *       caregiver. Used for viewing and logging (the everyday data endpoints).</li>
 *   <li>{@link #requirePrimaryOwner} — only the creator. Used for managing the
 *       care circle itself (inviting and removing caregivers).</li>
 * </ul>
 */
@Component
public class PetAccess {

    private final PetRepository petRepository;
    private final PetCaregiverRepository caregiverRepository;

    public PetAccess(PetRepository petRepository, PetCaregiverRepository caregiverRepository) {
        this.petRepository = petRepository;
        this.caregiverRepository = caregiverRepository;
    }

    /** The signed-in owner, or 401 if there is no valid session. */
    public Owner currentOwner() {
        Owner owner = OwnerContext.get();
        if (owner == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, Copy.t("Please sign in"));
        }
        return owner;
    }

    /**
     * Loads a pet the signed-in owner may view or log for — as the primary owner
     * or an accepted caregiver. Returns 404 for "missing", "not yours", and "not
     * shared with you" alike, so existence is never leaked.
     */
    public Pet requireOwnedPet(UUID petId) {
        Owner owner = currentOwner();
        Pet pet = petRepository.findById(petId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, Copy.t("Pet not found")));
        if (isPrimaryOwner(pet, owner) || caregiverRepository.existsByPetAndCaregiver(pet, owner)) {
            return pet;
        }
        throw new ResponseStatusException(HttpStatus.NOT_FOUND, Copy.t("Pet not found"));
    }

    /**
     * Loads a pet only if the signed-in owner is its primary owner (the creator).
     * Caregivers get 404 here — managing the care circle is the owner's alone.
     */
    public Pet requirePrimaryOwner(UUID petId) {
        Owner owner = currentOwner();
        return petRepository.findByIdAndOwner(petId, owner)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, Copy.t("Pet not found")));
    }

    // Reading the lazy owner proxy's id does not initialize it, so this is safe
    // even with open-in-view off.
    private boolean isPrimaryOwner(Pet pet, Owner owner) {
        Owner primary = pet.getOwner();
        return primary != null && owner.getId().equals(primary.getId());
    }
}
