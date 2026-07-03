package com.petpattern.repository;

import com.petpattern.domain.Owner;
import com.petpattern.domain.Pet;
import com.petpattern.domain.PetCaregiver;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PetCaregiverRepository extends JpaRepository<PetCaregiver, UUID> {

    boolean existsByPetAndCaregiver(Pet pet, Owner caregiver);

    List<PetCaregiver> findByPetOrderByAddedAtAsc(Pet pet);

    Optional<PetCaregiver> findByPetAndCaregiver_Id(Pet pet, UUID caregiverId);

    /** Pets shared *with* this owner (they're a caregiver, not the primary owner). */
    @Query("select pc.pet from PetCaregiver pc where pc.caregiver = :owner order by pc.pet.createdAt asc")
    List<Pet> findPetsSharedWith(Owner owner);

    void deleteByPet(Pet pet);

    /** Remove this owner's caregiver associations (used when they delete their account). */
    void deleteByCaregiver(Owner caregiver);
}
