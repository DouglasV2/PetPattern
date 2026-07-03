package com.petpattern.repository;

import com.petpattern.domain.Pet;
import com.petpattern.domain.PatternObservation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PatternObservationRepository extends JpaRepository<PatternObservation, UUID> {
    Optional<PatternObservation> findByPetAndPatternKey(Pet pet, String patternKey);
    List<PatternObservation> findByPet(Pet pet);
    void deleteByPet(Pet pet);
}
