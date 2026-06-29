package com.petpattern.api;

import com.petpattern.api.dto.FoodLogRequest;
import com.petpattern.api.dto.FoodLogResponse;
import com.petpattern.domain.FoodLog;
import com.petpattern.domain.Pet;
import com.petpattern.repository.FoodLogRepository;
import com.petpattern.repository.PetRepository;
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

    private final PetRepository petRepository;
    private final FoodLogRepository foodLogRepository;

    public FoodLogController(PetRepository petRepository, FoodLogRepository foodLogRepository) {
        this.petRepository = petRepository;
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
        return foodLogRepository.findFirstByPetOrderByDateStartedDesc(pet)
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
        return FoodLogResponse.from(foodLogRepository.save(foodLog));
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
