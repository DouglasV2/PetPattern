package com.petpattern.repository;

import com.petpattern.domain.ActivityLog;
import com.petpattern.domain.Pet;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ActivityLogRepository extends JpaRepository<ActivityLog, UUID> {

    List<ActivityLog> findByPetAndOccurredDateGreaterThanEqualOrderByOccurredDateAsc(Pet pet, LocalDate fromDate);

    List<ActivityLog> findByPetOrderByOccurredDateDesc(Pet pet);

    Optional<ActivityLog> findByIdAndPet(UUID id, Pet pet);

    void deleteByPet(Pet pet);
}
