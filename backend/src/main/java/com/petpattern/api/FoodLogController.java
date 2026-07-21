package com.petpattern.api;

import com.petpattern.api.dto.FoodLogRequest;
import com.petpattern.api.dto.FoodLogResponse;
import com.petpattern.domain.FoodKind;
import com.petpattern.domain.FoodLog;
import com.petpattern.domain.Pet;
import com.petpattern.auth.PetAccess;
import com.petpattern.i18n.Copy;
import com.petpattern.patterns.FoodBaseline;
import com.petpattern.repository.FoodLogRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/pets/{petId}/food-logs")
public class FoodLogController {

    private final PetAccess petAccess;
    private final FoodLogRepository foodLogRepository;

    public FoodLogController(PetAccess petAccess, FoodLogRepository foodLogRepository) {
        this.petAccess = petAccess;
        this.foodLogRepository = foodLogRepository;
    }

    @GetMapping
    public List<FoodLogResponse> list(@PathVariable UUID petId) {
        Pet pet = findPet(petId);
        return foodLogRepository.findByPetOrderByDateStartedDesc(pet).stream()
                .map(FoodLogResponse::from)
                .toList();
    }

    @GetMapping("/current")
    public ResponseEntity<FoodLogResponse> current(@PathVariable UUID petId) {
        Pet pet = findPet(petId);
        // The active MAIN_FOOD, never the most-recently-started treat/supplement (Part 1).
        return FoodBaseline.currentMainFood(foodLogRepository.findByPetOrderByDateStartedDesc(pet), LocalDate.now())
                .map(FoodLogResponse::from)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.<FoodLogResponse>noContent().build());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public FoodLogResponse create(@PathVariable UUID petId, @Valid @RequestBody FoodLogRequest request) {
        Pet pet = findPet(petId);
        LocalDate dateStarted = request.resolvedDateStarted();
        if (dateStarted == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "dateStarted is required");
        }
        // A start date can't be in the future — a fat-fingered year (e.g. 2090)
        // otherwise sorts to the top and masks the real current food, and corrupts
        // the food-trigger windows. One day of tolerance for east-of-UTC clocks,
        // mirroring the check-in guard.
        LocalDate today = LocalDate.now();
        if (dateStarted.isAfter(today.plusDays(1))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, Copy.t("A food start date can't be in the future"));
        }
        // Reject absurd past years (typos like 1200) that no pet could predate.
        if (dateStarted.isBefore(today.minusYears(50))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, Copy.t("Check the start year — that date is too far in the past"));
        }

        FoodLog foodLog = new FoodLog();
        foodLog.setPet(pet);
        foodLog.setDateStarted(dateStarted);
        foodLog.setFoodKind(request.resolvedFoodKind());
        foodLog.setBrand(clean(request.brand()));
        foodLog.setProductName(clean(request.resolvedProductName()));
        foodLog.setPrimaryProtein(request.resolvedPrimaryProtein());
        foodLog.setSecondaryProteins(request.resolvedSecondaryProteins());
        foodLog.setGrainFree(request.grainFree());
        foodLog.setNewFood(request.newFood());
        foodLog.setAmountGrams(request.amountGrams());
        foodLog.setNotes(clean(request.notes()));
        FoodLog saved = foodLogRepository.save(foodLog);

        // A new main food closes the previous main-food period (Part 1): relink the
        // whole chain so each period ends where the next begins. Treats/supplements
        // are point events and leave the main-food chain untouched.
        if (saved.getFoodKind() == FoodKind.MAIN_FOOD) {
            List<FoodLog> mainFoods = foodLogRepository.findByPetOrderByDateStartedDesc(pet).stream()
                    .filter(existing -> existing.getFoodKind() == FoodKind.MAIN_FOOD)
                    .toList();
            FoodBaseline.relinkChain(mainFoods);
            foodLogRepository.saveAll(mainFoods);
        }
        return FoodLogResponse.from(saved);
    }

    @DeleteMapping("/{foodLogId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID petId, @PathVariable UUID foodLogId) {
        Pet pet = findPet(petId);
        FoodLog foodLog = foodLogRepository.findById(foodLogId)
                .filter(existing -> existing.getPet().getId().equals(pet.getId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Food log not found"));
        foodLogRepository.delete(foodLog);
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
