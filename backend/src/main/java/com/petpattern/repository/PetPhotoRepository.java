package com.petpattern.repository;

import com.petpattern.domain.Pet;
import com.petpattern.domain.PetPhoto;
import com.petpattern.domain.PhotoArea;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PetPhotoRepository extends JpaRepository<PetPhoto, UUID> {

    // Closed projection — selects metadata columns only, never the bytea blob.
    List<PhotoView> findPhotoViewByPetOrderByCapturedDateDescCreatedAtDesc(Pet pet);

    // Profile photos are kept separate from health/progression photos so a cute
    // pet portrait never shows up as a symptom photo in the gallery/timeline.
    List<PhotoView> findPhotoViewByPetAndAreaOrderByCapturedDateDescCreatedAtDesc(Pet pet, PhotoArea area);

    // The pet's most-recent profile photo as a metadata-only projection (no bytea) —
    // used to point a small sidebar avatar at that photo's image URL. Empty if none.
    Optional<PhotoView> findFirstPhotoViewByPetAndAreaOrderByCapturedDateDescCreatedAtDesc(Pet pet, PhotoArea area);

    long countByPet(Pet pet);

    long countByPetAndCapturedDateGreaterThanEqual(Pet pet, java.time.LocalDate fromDate);

    long countByPetAndAreaNotAndCapturedDateGreaterThanEqual(Pet pet, PhotoArea area, java.time.LocalDate fromDate);

    void deleteByPet(Pet pet);
}
