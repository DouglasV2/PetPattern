package com.petpattern.repository;

import com.petpattern.domain.Pet;
import com.petpattern.domain.VetShare;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface VetShareRepository extends JpaRepository<VetShare, UUID> {

    Optional<VetShare> findFirstByPetOrderByCreatedAtDesc(Pet pet);

    Optional<VetShare> findByTokenHash(String tokenHash);

    void deleteByPet(Pet pet);

    void deleteByExpiresAtBefore(Instant cutoff);
}
