package com.petpattern.repository;

import com.petpattern.domain.FoodTrial;
import com.petpattern.domain.Pet;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface FoodTrialRepository extends JpaRepository<FoodTrial, UUID> {

    List<FoodTrial> findByPetOrderByStartDateDesc(Pet pet);

    void deleteByPet(Pet pet);
}
