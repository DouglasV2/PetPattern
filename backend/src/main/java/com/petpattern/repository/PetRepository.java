package com.petpattern.repository;

import com.petpattern.domain.Pet;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PetRepository extends JpaRepository<Pet, UUID> {
    Optional<Pet> findFirstByNameIgnoreCase(String name);
}
