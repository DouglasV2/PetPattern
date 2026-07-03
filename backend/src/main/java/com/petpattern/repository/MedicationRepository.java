package com.petpattern.repository;

import com.petpattern.domain.Medication;
import com.petpattern.domain.Pet;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MedicationRepository extends JpaRepository<Medication, UUID> {

    List<Medication> findByPetOrderByStartDateDesc(Pet pet);

    Optional<Medication> findByIdAndPet(UUID id, Pet pet);

    void deleteByPet(Pet pet);
}
