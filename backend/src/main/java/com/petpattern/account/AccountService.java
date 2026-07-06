package com.petpattern.account;

import com.petpattern.domain.Owner;
import com.petpattern.domain.Pet;
import com.petpattern.repository.AiParseAttemptRepository;
import com.petpattern.repository.AuthSessionRepository;
import com.petpattern.repository.DailyCheckInRepository;
import com.petpattern.repository.FoodLogRepository;
import com.petpattern.repository.FoodTrialRepository;
import com.petpattern.repository.MedicationRepository;
import com.petpattern.repository.OwnerRepository;
import com.petpattern.repository.PasswordResetTokenRepository;
import com.petpattern.repository.PatternObservationRepository;
import com.petpattern.repository.PetCaregiverRepository;
import com.petpattern.repository.PetInviteRepository;
import com.petpattern.repository.PetPhotoRepository;
import com.petpattern.repository.PetRepository;
import com.petpattern.repository.VetShareRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

/**
 * Permanent account deletion (GDPR erasure). Deletes everything PetPattern holds
 * for the owner:
 * <ul>
 *   <li>every pet they primarily own, and all of that pet's data (check-ins,
 *       food logs, patterns, photos, trials, medications, vet shares, invites,
 *       caregiver links) — including other people's caregiver access to those
 *       pets, since the pet itself goes;</li>
 *   <li>their own caregiver access to <em>other</em> owners' pets (association
 *       only — never the other owner's pet or its data);</li>
 *   <li>any pending invites addressed to their email;</li>
 *   <li>their sessions, then the account row itself.</li>
 * </ul>
 * This is a hard delete — no personal data is left behind.
 */
@Service
public class AccountService {

    private final PetRepository petRepository;
    private final OwnerRepository ownerRepository;
    private final DailyCheckInRepository checkInRepository;
    private final FoodLogRepository foodLogRepository;
    private final PatternObservationRepository observationRepository;
    private final PetPhotoRepository photoRepository;
    private final FoodTrialRepository trialRepository;
    private final MedicationRepository medicationRepository;
    private final VetShareRepository vetShareRepository;
    private final PetCaregiverRepository caregiverRepository;
    private final PetInviteRepository inviteRepository;
    private final AuthSessionRepository sessionRepository;
    private final AiParseAttemptRepository aiParseAttemptRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;

    @PersistenceContext
    private EntityManager entityManager;

    public AccountService(PetRepository petRepository,
                          OwnerRepository ownerRepository,
                          DailyCheckInRepository checkInRepository,
                          FoodLogRepository foodLogRepository,
                          PatternObservationRepository observationRepository,
                          PetPhotoRepository photoRepository,
                          FoodTrialRepository trialRepository,
                          MedicationRepository medicationRepository,
                          VetShareRepository vetShareRepository,
                          PetCaregiverRepository caregiverRepository,
                          PetInviteRepository inviteRepository,
                          AuthSessionRepository sessionRepository,
                          AiParseAttemptRepository aiParseAttemptRepository,
                          PasswordResetTokenRepository passwordResetTokenRepository) {
        this.petRepository = petRepository;
        this.ownerRepository = ownerRepository;
        this.checkInRepository = checkInRepository;
        this.foodLogRepository = foodLogRepository;
        this.observationRepository = observationRepository;
        this.photoRepository = photoRepository;
        this.trialRepository = trialRepository;
        this.medicationRepository = medicationRepository;
        this.vetShareRepository = vetShareRepository;
        this.caregiverRepository = caregiverRepository;
        this.inviteRepository = inviteRepository;
        this.sessionRepository = sessionRepository;
        this.aiParseAttemptRepository = aiParseAttemptRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
    }

    /**
     * Permanently delete a single owned pet and everything hanging off it. The
     * caller must have already confirmed the pet belongs to this owner.
     */
    @Transactional
    public void deletePet(Pet pet) {
        wipePetChildren(pet);
        entityManager.flush();
        petRepository.delete(pet);
        entityManager.flush();
    }

    // Delete a pet's children in FK order (children before the pet). Shared with
    // full-account deletion so both paths erase exactly the same data.
    private void wipePetChildren(Pet pet) {
        observationRepository.deleteByPet(pet);
        checkInRepository.deleteByPet(pet);
        foodLogRepository.deleteByPet(pet);
        photoRepository.deleteByPet(pet);
        trialRepository.deleteByPet(pet);
        medicationRepository.deleteByPet(pet);
        vetShareRepository.deleteByPet(pet);
        inviteRepository.deleteByPet(pet);
        caregiverRepository.deleteByPet(pet);
        // AI note-parse audit rows hold the owner's raw notes (petId is a plain
        // column, no FK), so erase them explicitly for a complete GDPR delete.
        aiParseAttemptRepository.deleteByPetId(pet.getId());
    }

    @Transactional
    public void deleteAccount(Owner owner) {
        List<Pet> ownedPets = petRepository.findByOwnerOrderByCreatedAtAsc(owner);

        // 1. Wipe every owned pet's children first (FK order: children before pet).
        for (Pet pet : ownedPets) {
            wipePetChildren(pet);
        }
        // Force the child deletes to hit the DB before removing the pets they reference.
        entityManager.flush();

        // 2. The pets themselves.
        petRepository.deleteAll(ownedPets);
        entityManager.flush();

        // 3. This owner's access to OTHER owners' pets (association only).
        caregiverRepository.deleteByCaregiver(owner);

        // 4. Pending invites addressed to this owner's email.
        inviteRepository.deleteByInvitedEmail(owner.getEmail() == null
                ? "" : owner.getEmail().trim().toLowerCase(Locale.ROOT));

        // 5. Sessions and any outstanding password-reset tokens, then the account row.
        sessionRepository.deleteByOwner(owner);
        passwordResetTokenRepository.deleteByOwner(owner);
        entityManager.flush();
        ownerRepository.delete(owner);
        entityManager.flush();
    }
}
