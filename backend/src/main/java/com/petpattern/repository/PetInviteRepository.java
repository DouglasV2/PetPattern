package com.petpattern.repository;

import com.petpattern.domain.Pet;
import com.petpattern.domain.PetInvite;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PetInviteRepository extends JpaRepository<PetInvite, UUID> {

    boolean existsByPetAndInvitedEmail(Pet pet, String invitedEmail);

    Optional<PetInvite> findByPetAndInvitedEmail(Pet pet, String invitedEmail);

    List<PetInvite> findByPetOrderByCreatedAtAsc(Pet pet);

    /** Pending invites addressed to this email — the invitee's inbox. */
    List<PetInvite> findByInvitedEmailOrderByCreatedAtAsc(String invitedEmail);

    Optional<PetInvite> findByIdAndPet(UUID id, Pet pet);

    void deleteByPet(Pet pet);

    /** Remove pending invites addressed to this email (used on account deletion). */
    void deleteByInvitedEmail(String invitedEmail);

    void deleteByExpiresAtBefore(Instant cutoff);
}
