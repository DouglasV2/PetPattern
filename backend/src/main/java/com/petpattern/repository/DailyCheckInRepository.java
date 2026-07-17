package com.petpattern.repository;

import com.petpattern.domain.DailyCheckIn;
import com.petpattern.domain.Owner;
import com.petpattern.domain.Pet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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
    Optional<DailyCheckIn> findFirstByPetOrderByCheckInDateAsc(Pet pet);
    long countByPet(Pet pet);
    void deleteByPet(Pet pet);

    /** Distinct check-ins across all of an owner's pets — the account-level "useful check-in"
     *  count that drives the first/third/seventh activation milestones. */
    @Query("select count(c) from DailyCheckIn c where c.pet.owner = :owner")
    long countByOwner(@Param("owner") Owner owner);
}
