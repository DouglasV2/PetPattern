package com.petpattern.repository;

import com.petpattern.domain.Pet;
import com.petpattern.domain.PetPhoto;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PetPhotoRepository extends JpaRepository<PetPhoto, UUID> {

    // Closed projection — selects metadata columns only, never the bytea blob.
    List<PhotoView> findPhotoViewByPetOrderByCapturedDateDescCreatedAtDesc(Pet pet);

    long countByPet(Pet pet);

    long countByPetAndCapturedDateGreaterThanEqual(Pet pet, java.time.LocalDate fromDate);

    void deleteByPet(Pet pet);
}
