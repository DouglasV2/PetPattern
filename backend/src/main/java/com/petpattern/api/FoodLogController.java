package com.petpattern.api;

import com.petpattern.api.dto.FoodLogRequest;
import com.petpattern.api.dto.FoodLogResponse;
import com.petpattern.domain.FoodLog;
import com.petpattern.domain.Pet;
import com.petpattern.repository.FoodLogRepository;
import com.petpattern.repository.PetRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

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
        return foodLogRepository.findByPetOrderByDateDesc(pet).stream()
                .map(FoodLogResponse::from)
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public FoodLogResponse create(@PathVariable UUID petId, @Valid @RequestBody FoodLogRequest request) {
        Pet pet = findPet(petId);
        FoodLog foodLog = new FoodLog();
        foodLog.setPet(pet);
        foodLog.setDate(request.date());
        foodLog.setBrand(clean(request.brand()));
        foodLog.setRecipeName(clean(request.recipeName()));
        foodLog.setPrimaryProtein(clean(request.primaryProtein()));
        foodLog.setAmountGrams(request.amountGrams());
        foodLog.setNewFood(request.newFood());
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
