package com.petpattern.repository;

import com.petpattern.domain.Owner;
import com.petpattern.domain.Pet;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PetRepository extends JpaRepository<Pet, UUID> {
    List<Pet> findByOwnerOrderByCreatedAtAsc(Owner owner);

    Optional<Pet> findByIdAndOwner(UUID id, Owner owner);

    Optional<Pet> findFirstByOwnerAndNameIgnoreCase(Owner owner, String name);
}
