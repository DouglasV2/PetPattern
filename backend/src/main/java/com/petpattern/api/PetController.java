package com.petpattern.api;

import com.petpattern.api.dto.*;
import com.petpattern.domain.DailyCheckIn;
import com.petpattern.domain.FoodLog;
import com.petpattern.domain.Pet;
import com.petpattern.domain.Sex;
import com.petpattern.patterns.PatternEngine;
import com.petpattern.repository.DailyCheckInRepository;
import com.petpattern.repository.FoodLogRepository;
import com.petpattern.repository.PetRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/pets")
public class PetController {

    private final PetRepository petRepository;
    private final DailyCheckInRepository checkInRepository;
    private final FoodLogRepository foodLogRepository;
    private final PatternEngine patternEngine;

    public PetController(PetRepository petRepository,
                         DailyCheckInRepository checkInRepository,
                         FoodLogRepository foodLogRepository,
                         PatternEngine patternEngine) {
        this.petRepository = petRepository;
        this.checkInRepository = checkInRepository;
        this.foodLogRepository = foodLogRepository;
        this.patternEngine = patternEngine;
    }

    @GetMapping
    public List<PetResponse> listPets() {
        return petRepository.findAll().stream().map(PetResponse::from).toList();
    }

    @GetMapping("/{petId}")
    public PetResponse getPet(@PathVariable UUID petId) {
        return PetResponse.from(findPet(petId));
    }

    @GetMapping("/{petId}/overview")
    public PetOverviewResponse overview(@PathVariable UUID petId) {
        Pet pet = findPet(petId);
        DailyCheckIn latestCheckIn = checkInRepository.findFirstByPetOrderByCheckInDateDesc(pet).orElse(null);
        FoodLog currentFood = foodLogRepository.findFirstByPetOrderByDateStartedDesc(pet).orElse(null);
        List<PatternResponse> patterns = patternEngine.analyze(petId).stream()
                .map(PatternResponse::from)
                .toList();

        String status = todayStatus(latestCheckIn, patterns);
        return new PetOverviewResponse(
                PetResponse.from(pet),
                latestCheckIn == null ? null : CheckInResponse.from(latestCheckIn),
                currentFood == null ? null : FoodLogResponse.from(currentFood),
                patterns,
                status,
                todayExplanation(pet, latestCheckIn, patterns, status),
                nextAction(latestCheckIn, patterns)
        );
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PetResponse createPet(@Valid @RequestBody PetCreateRequest request) {
        Pet pet = new Pet();
        pet.setName(request.name().trim());
        pet.setSpecies(request.species());
        pet.setBreed(clean(request.breed()));
        pet.setBirthDate(request.birthDate());
        pet.setSex(request.sex() == null ? Sex.UNKNOWN : request.sex());
        pet.setCurrentWeightKg(request.currentWeightKg());
        return PetResponse.from(petRepository.save(pet));
    }

    private String todayStatus(DailyCheckIn latestCheckIn, List<PatternResponse> patterns) {
        if (latestCheckIn == null || !latestCheckIn.getCheckInDate().isEqual(LocalDate.now())) {
            return "changed";
        }
        boolean recentFlags = latestCheckIn.getItchingScore() != null && latestCheckIn.getItchingScore() >= 6
                || latestCheckIn.isVomiting()
                || latestCheckIn.isDiarrhea()
                || latestCheckIn.isEarRedness();
        if (recentFlags || patterns.stream().anyMatch(pattern -> "HIGH".equals(pattern.confidence()))) {
            return "watch";
        }
        return "normal";
    }

    private String todayExplanation(Pet pet, DailyCheckIn latestCheckIn, List<PatternResponse> patterns, String status) {
        if (latestCheckIn == null) {
            return "Start with one quick check-in so PetPattern can begin learning what normal looks like for " + pet.getName() + ".";
        }
        if (!latestCheckIn.getCheckInDate().isEqual(LocalDate.now())) {
            return pet.getName() + " has history, but today has not been logged yet.";
        }
        if (!patterns.isEmpty()) {
            return patterns.get(0).summary();
        }
        if ("normal".equals(status)) {
            return pet.getName() + " looks close to the recent normal range from the latest log.";
        }
        return pet.getName() + " has a recent change worth keeping an eye on.";
    }

    private String nextAction(DailyCheckIn latestCheckIn, List<PatternResponse> patterns) {
        if (latestCheckIn == null || !latestCheckIn.getCheckInDate().isEqual(LocalDate.now())) {
            return "Log today";
        }
        if (!patterns.isEmpty()) {
            return "Show what changed";
        }
        return "Keep tracking";
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
