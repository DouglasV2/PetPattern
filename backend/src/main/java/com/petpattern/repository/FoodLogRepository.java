package com.petpattern.repository;

import com.petpattern.domain.FoodLog;
import com.petpattern.domain.Pet;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FoodLogRepository extends JpaRepository<FoodLog, UUID> {
    List<FoodLog> findByPetOrderByDateStartedDesc(Pet pet);
    List<FoodLog> findByPetAndDateStartedGreaterThanEqualOrderByDateStartedAsc(Pet pet, LocalDate fromDate);
    Optional<FoodLog> findFirstByPetOrderByDateStartedDesc(Pet pet);
    void deleteByPet(Pet pet);
}
