package com.petpattern.repository;

import com.petpattern.domain.DailyCheckIn;
import com.petpattern.domain.Pet;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DailyCheckInRepository extends JpaRepository<DailyCheckIn, UUID> {
    List<DailyCheckIn> findByPetOrderByCheckInDateDesc(Pet pet);
    List<DailyCheckIn> findByPetOrderByCheckInDateAsc(Pet pet);
    List<DailyCheckIn> findByPetAndCheckInDateGreaterThanEqualOrderByCheckInDateAsc(Pet pet, LocalDate fromDate);
    Optional<DailyCheckIn> findByPetAndCheckInDate(Pet pet, LocalDate checkInDate);
    Optional<DailyCheckIn> findFirstByPetOrderByCheckInDateDesc(Pet pet);
    void deleteByPet(Pet pet);
}
