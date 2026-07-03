package com.petpattern.caregiver;

import com.petpattern.domain.Owner;
import com.petpattern.domain.Pet;
import com.petpattern.domain.PetCaregiver;
import com.petpattern.domain.PetInvite;
import com.petpattern.repository.OwnerRepository;
import com.petpattern.repository.PetCaregiverRepository;
import com.petpattern.repository.PetInviteRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/**
 * The care circle: who else can help with a pet. A pet keeps one primary owner
 * (the creator) who sends invites; anyone invited must accept before they get
 * access, so nobody is added to a pet without their own consent.
 */
@Service
public class CaregiverService {

    static final Duration INVITE_TTL = Duration.ofDays(14);

    private final PetCaregiverRepository caregivers;
    private final PetInviteRepository invites;
    private final OwnerRepository owners;

    public CaregiverService(PetCaregiverRepository caregivers,
                            PetInviteRepository invites,
                            OwnerRepository owners) {
        this.caregivers = caregivers;
        this.invites = invites;
        this.owners = owners;
    }

    // ---- Owner side (managing a pet's care circle) ----

    public List<PetCaregiver> listCaregivers(Pet pet) {
        return caregivers.findByPetOrderByAddedAtAsc(pet);
    }

    public List<PetInvite> listInvites(Pet pet) {
        return invites.findByPetOrderByCreatedAtAsc(pet);
    }

    /** Invites someone by email. The primary owner does this; the invitee consents later. */
    @Transactional
    public PetInvite invite(Pet pet, Owner primaryOwner, String rawEmail) {
        String email = normalize(rawEmail);
        if (email.isBlank() || !email.contains("@")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Enter a valid email");
        }
        if (email.equals(normalize(primaryOwner.getEmail()))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "That's you — you already have this pet");
        }
        // Already a caregiver? (resolve the email to an owner first, if it exists)
        Owner existing = owners.findByEmail(email).orElse(null);
        if (existing != null && caregivers.existsByPetAndCaregiver(pet, existing)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "They already help with this pet");
        }
        // Block only on a *live* invite. A stale (expired) one is invisible to the
        // invitee, so treat it as reusable — replace it rather than dead-ending on
        // the unique constraint until the daily purge runs.
        PetInvite outstanding = invites.findByPetAndInvitedEmail(pet, email).orElse(null);
        if (outstanding != null) {
            if (outstanding.getExpiresAt().isAfter(Instant.now())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "They've already been invited");
            }
            invites.delete(outstanding);
            invites.flush();
        }
        PetInvite invite = new PetInvite();
        invite.setPet(pet);
        invite.setInvitedEmail(email);
        invite.setInvitedBy(primaryOwner);
        invite.setExpiresAt(Instant.now().plus(INVITE_TTL));
        return invites.save(invite);
    }

    @Transactional
    public void removeCaregiver(Pet pet, UUID caregiverOwnerId) {
        PetCaregiver row = caregivers.findByPetAndCaregiver_Id(pet, caregiverOwnerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Not a caregiver on this pet"));
        caregivers.delete(row);
    }

    @Transactional
    public void cancelInvite(Pet pet, UUID inviteId) {
        PetInvite invite = invites.findByIdAndPet(inviteId, pet)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invite not found"));
        invites.delete(invite);
    }

    // ---- Caregiver side (self-service) ----

    /** A caregiver stepping away from a pet they were helping with. */
    @Transactional
    public void leave(Pet pet, Owner caregiver) {
        PetCaregiver row = caregivers.findByPetAndCaregiver_Id(pet, caregiver.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "You don't help with this pet"));
        caregivers.delete(row);
    }

    // ---- Invitee side (their inbox) ----

    public List<PetInvite> myInvites(Owner me) {
        String email = normalize(me.getEmail());
        return invites.findByInvitedEmailOrderByCreatedAtAsc(email).stream()
                .filter(invite -> invite.getExpiresAt().isAfter(Instant.now()))
                .toList();
    }

    /** Accepts an invite addressed to me, becoming a caregiver. Returns the pet. */
    @Transactional
    public Pet accept(Owner me, UUID inviteId) {
        PetInvite invite = requireMyInvite(me, inviteId);
        Pet pet = invite.getPet();
        // The primary owner accepting their own pet's invite is a no-op on access.
        boolean isPrimaryOwner = pet.getOwner() != null && me.getId().equals(pet.getOwner().getId());
        if (!isPrimaryOwner && !caregivers.existsByPetAndCaregiver(pet, me)) {
            PetCaregiver row = new PetCaregiver();
            row.setPet(pet);
            row.setCaregiver(me);
            try {
                // Flush now so a concurrent accept (double-click / two tabs) surfaces
                // the unique-constraint hit here, where we can treat it as success —
                // accepting is idempotent, so "already added" is not an error.
                caregivers.saveAndFlush(row);
            } catch (DataIntegrityViolationException alreadyAdded) {
                // Someone (or the other request) already made them a caregiver.
            }
        }
        invites.delete(invite);
        return pet;
    }

    @Transactional
    public void decline(Owner me, UUID inviteId) {
        invites.delete(requireMyInvite(me, inviteId));
    }

    /** An invite exists AND is addressed to me AND hasn't expired — else 404 (no leak). */
    private PetInvite requireMyInvite(Owner me, UUID inviteId) {
        PetInvite invite = invites.findById(inviteId)
                .filter(candidate -> candidate.getInvitedEmail().equals(normalize(me.getEmail())))
                .filter(candidate -> candidate.getExpiresAt().isAfter(Instant.now()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "This invite is no longer available"));
        return invite;
    }

    @Scheduled(fixedRate = 86_400_000L)
    @Transactional
    public void purgeExpired() {
        invites.deleteByExpiresAtBefore(Instant.now());
    }

    private String normalize(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }
}
