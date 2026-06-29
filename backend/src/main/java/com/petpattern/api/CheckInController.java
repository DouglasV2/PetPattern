package com.petpattern.api;

import com.petpattern.api.dto.CheckInRequest;
import com.petpattern.api.dto.CheckInResponse;
import com.petpattern.domain.DailyCheckIn;
import com.petpattern.domain.Pet;
import com.petpattern.repository.DailyCheckInRepository;
import com.petpattern.repository.PetRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/pets/{petId}/checkins")
public class CheckInController {

    private final PetRepository petRepository;
    private final DailyCheckInRepository checkInRepository;

    public CheckInController(PetRepository petRepository, DailyCheckInRepository checkInRepository) {
        this.petRepository = petRepository;
        this.checkInRepository = checkInRepository;
    }

    @GetMapping
    public List<CheckInResponse> list(@PathVariable UUID petId) {
        Pet pet = findPet(petId);
        return checkInRepository.findByPetOrderByCheckInDateDesc(pet).stream()
                .map(CheckInResponse::from)
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CheckInResponse upsert(@PathVariable UUID petId, @Valid @RequestBody CheckInRequest request) {
        Pet pet = findPet(petId);

        DailyCheckIn checkIn = checkInRepository.findByPetAndCheckInDate(pet, request.checkInDate())
                .orElseGet(DailyCheckIn::new);

        checkIn.setPet(pet);
        checkIn.setCheckInDate(request.checkInDate());
        checkIn.setStoolScore(request.stoolScore());
        checkIn.setItchingScore(request.itchingScore());
        checkIn.setEnergyScore(request.energyScore());
        checkIn.setAppetiteScore(request.appetiteScore());
        checkIn.setSleepQualityScore(request.sleepQualityScore());
        checkIn.setWaterIntakeMl(request.waterIntakeMl());
        checkIn.setVomiting(request.vomiting());
        checkIn.setDiarrhea(request.diarrhea());
        checkIn.setEarRedness(request.earRedness());
        checkIn.setNotes(clean(request.notes()));

        return CheckInResponse.from(checkInRepository.save(checkIn));
    }

    private Pet findPet(UUID petId) {
        return petRepository.findById(petId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pet not found"));
    }

    private String clean(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
