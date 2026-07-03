package com.petpattern.api;

import com.petpattern.api.dto.CheckInRequest;
import com.petpattern.api.dto.CheckInResponse;
import com.petpattern.domain.DailyCheckIn;
import com.petpattern.domain.Pet;
import com.petpattern.domain.StoolState;
import com.petpattern.auth.PetAccess;
import com.petpattern.i18n.Copy;
import com.petpattern.repository.DailyCheckInRepository;
import jakarta.validation.Valid;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping({"/api/pets/{petId}/check-ins", "/api/pets/{petId}/checkins"})
public class CheckInController {

    private final PetAccess petAccess;
    private final DailyCheckInRepository checkInRepository;

    public CheckInController(PetAccess petAccess, DailyCheckInRepository checkInRepository) {
        this.petAccess = petAccess;
        this.checkInRepository = checkInRepository;
    }

    @GetMapping
    public List<CheckInResponse> list(@PathVariable UUID petId) {
        Pet pet = findPet(petId);
        return checkInRepository.findByPetOrderByCheckInDateDesc(pet).stream()
                .map(CheckInResponse::from)
                .toList();
    }

    @GetMapping("/latest")
    public ResponseEntity<CheckInResponse> latest(@PathVariable UUID petId) {
        Pet pet = findPet(petId);
        return checkInRepository.findFirstByPetOrderByCheckInDateDesc(pet)
                .map(CheckInResponse::from)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.<CheckInResponse>noContent().build());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CheckInResponse upsert(@PathVariable UUID petId, @Valid @RequestBody CheckInRequest request) {
        Pet pet = findPet(petId);

        // A check-in can't be from the future — keeps counts (streaks, recap
        // totals, milestones) honest. The server clock is UTC, so allow one day
        // of tolerance: for a user east of UTC, "today" is already tomorrow here
        // between their midnight and UTC midnight. Genuine future logging (2+
        // days) is still rejected.
        if (request.checkInDate() != null && request.checkInDate().isAfter(java.time.LocalDate.now().plusDays(1))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, Copy.t("A check-in can't be in the future"));
        }

        try {
            return CheckInResponse.from(persist(pet, request));
        } catch (DataIntegrityViolationException race) {
            // Two writes for the same (pet, date) landed at once — a double-tapped
            // "Save" or a retry on a flaky connection — and collided on the
            // uk_pet_checkin_date unique constraint. The winning row is now
            // committed, so run once more: this time we find it and update instead
            // of inserting a duplicate.
            return CheckInResponse.from(persist(pet, request));
        }
    }

    /** Find-or-create the day's check-in, apply the request, and save. */
    private DailyCheckIn persist(Pet pet, CheckInRequest request) {
        DailyCheckIn checkIn = checkInRepository.findByPetAndCheckInDate(pet, request.checkInDate())
                .orElseGet(DailyCheckIn::new);

        String note = clean(request.resolvedNote());
        StoolState stoolState = request.resolvedStoolState();

        checkIn.setPet(pet);
        checkIn.setCheckInDate(request.checkInDate());
        checkIn.setItchingScore(request.itchingScore());
        checkIn.setStoolState(stoolState);
        checkIn.setStoolScore(request.resolvedStoolScore());
        checkIn.setAppetiteLevel(request.resolvedAppetiteLevel());
        checkIn.setWaterLevel(request.resolvedWaterLevel());
        checkIn.setEnergyLevel(request.resolvedEnergyLevel());
        checkIn.setEnergyScore(request.energyScore());
        checkIn.setAppetiteScore(request.appetiteScore());
        checkIn.setSleepQualityScore(request.sleepQualityScore());
        checkIn.setWaterIntakeMl(request.waterIntakeMl());
        checkIn.setVomiting(request.vomiting());
        checkIn.setDiarrhea(request.diarrhea() || stoolState == StoolState.DIARRHEA);
        checkIn.setEarRedness(request.earRedness());
        checkIn.setLitterBoxUse(request.resolvedLitterBoxUse());
        checkIn.setUrinationChange(request.resolvedUrinationChange());
        checkIn.setStraining(request.straining());
        checkIn.setHidingBehavior(request.resolvedHidingBehavior());
        checkIn.setWeightConcern(request.weightConcern());
        checkIn.setFreeTextNote(note);
        checkIn.setNotes(note);

        return checkInRepository.save(checkIn);
    }

    @DeleteMapping("/{checkInId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID petId, @PathVariable UUID checkInId) {
        Pet pet = findPet(petId);
        DailyCheckIn checkIn = checkInRepository.findById(checkInId)
                .filter(existing -> existing.getPet().getId().equals(pet.getId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Check-in not found"));
        checkInRepository.delete(checkIn);
    }

    private Pet findPet(UUID petId) {
        return petAccess.requireOwnedPet(petId);
    }

    private String clean(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
