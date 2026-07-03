package com.petpattern.api;

import com.petpattern.api.dto.CreateFoodTrialRequest;
import com.petpattern.api.dto.FoodTrialResponse;
import com.petpattern.api.dto.TrialDateRequest;
import com.petpattern.domain.FoodTrial;
import com.petpattern.domain.Pet;
import com.petpattern.domain.Protein;
import com.petpattern.domain.TrialStatus;
import com.petpattern.auth.PetAccess;
import com.petpattern.repository.FoodTrialRepository;
import com.petpattern.trials.FoodTrialService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/pets/{petId}/food-trials")
public class FoodTrialController {

    private static final int MAX_NOTES = 500;
    private static final int MAX_OPEN_TRIALS = 6;

    private final PetAccess petAccess;
    private final FoodTrialRepository trialRepository;
    private final FoodTrialService trialService;

    public FoodTrialController(PetAccess petAccess,
                              FoodTrialRepository trialRepository,
                              FoodTrialService trialService) {
        this.petAccess = petAccess;
        this.trialRepository = trialRepository;
        this.trialService = trialService;
    }

    @GetMapping
    public List<FoodTrialResponse> list(@PathVariable UUID petId) {
        Pet pet = findPet(petId);
        return trialRepository.findByPetOrderByStartDateDesc(pet).stream()
                .map(trial -> trialService.toResponse(trial, pet.getName()))
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public FoodTrialResponse create(@PathVariable UUID petId, @RequestBody CreateFoodTrialRequest request) {
        Pet pet = findPet(petId);

        Protein protein = Protein.from(request.protein());
        if (protein == Protein.UNKNOWN) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Pick an ingredient to remove");
        }

        long open = trialRepository.findByPetOrderByStartDateDesc(pet).stream()
                .filter(t -> t.getStatus() == TrialStatus.ACTIVE || t.getStatus() == TrialStatus.REINTRODUCED)
                .count();
        if (open >= MAX_OPEN_TRIALS) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Too many trials in progress — wrap one up first");
        }

        LocalDate startDate = request.startDate() != null ? request.startDate() : LocalDate.now();
        if (startDate.isAfter(LocalDate.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The start date can't be in the future");
        }
        LocalDate targetEnd;
        if (request.targetEndDate() != null) {
            targetEnd = request.targetEndDate();
        } else {
            int weeks = request.weeks() == null ? 3 : Math.max(1, Math.min(12, request.weeks()));
            targetEnd = startDate.plusWeeks(weeks).minusDays(1);
        }
        if (!targetEnd.isAfter(startDate)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The trial needs to last at least a day");
        }
        if (targetEnd.isAfter(startDate.plusWeeks(16))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Keep the trial under a few months");
        }

        FoodTrial trial = new FoodTrial();
        trial.setPet(pet);
        trial.setProtein(protein.name());
        trial.setStartDate(startDate);
        trial.setTargetEndDate(targetEnd);
        trial.setStatus(TrialStatus.ACTIVE);
        trial.setNotes(clean(request.notes()));
        return trialService.toResponse(trialRepository.save(trial), pet.getName());
    }

    @PostMapping("/{trialId}/reintroduce")
    public FoodTrialResponse reintroduce(@PathVariable UUID petId,
                                         @PathVariable UUID trialId,
                                         @RequestBody(required = false) TrialDateRequest request) {
        Pet pet = findPet(petId);
        FoodTrial trial = findTrial(pet, trialId);
        if (trial.getStatus() != TrialStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only a trial that's still running can be reintroduced");
        }
        LocalDate date = request != null && request.date() != null ? request.date() : LocalDate.now();
        if (date.isBefore(trial.getStartDate())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reintroduction can't be before the trial started");
        }
        if (date.isAfter(LocalDate.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reintroduction can't be in the future");
        }
        trial.setReintroducedDate(date);
        trial.setCompletedDate(null);
        trial.setStatus(TrialStatus.REINTRODUCED);
        return trialService.toResponse(trialRepository.save(trial), pet.getName());
    }

    @PostMapping("/{trialId}/complete")
    public FoodTrialResponse complete(@PathVariable UUID petId, @PathVariable UUID trialId) {
        Pet pet = findPet(petId);
        FoodTrial trial = findTrial(pet, trialId);
        requireOpen(trial);
        trial.setCompletedDate(LocalDate.now());
        trial.setStatus(TrialStatus.COMPLETED);
        return trialService.toResponse(trialRepository.save(trial), pet.getName());
    }

    @PostMapping("/{trialId}/abandon")
    public FoodTrialResponse abandon(@PathVariable UUID petId, @PathVariable UUID trialId) {
        Pet pet = findPet(petId);
        FoodTrial trial = findTrial(pet, trialId);
        requireOpen(trial);
        trial.setCompletedDate(LocalDate.now());
        trial.setStatus(TrialStatus.ABANDONED);
        return trialService.toResponse(trialRepository.save(trial), pet.getName());
    }

    private void requireOpen(FoodTrial trial) {
        if (trial.getStatus() != TrialStatus.ACTIVE && trial.getStatus() != TrialStatus.REINTRODUCED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This trial is already wrapped up");
        }
    }

    @DeleteMapping("/{trialId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID petId, @PathVariable UUID trialId) {
        Pet pet = findPet(petId);
        FoodTrial trial = findTrial(pet, trialId);
        trialRepository.delete(trial);
    }

    private FoodTrial findTrial(Pet pet, UUID trialId) {
        return trialRepository.findById(trialId)
                .filter(existing -> existing.getPet().getId().equals(pet.getId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Trial not found"));
    }

    private Pet findPet(UUID petId) {
        return petAccess.requireOwnedPet(petId);
    }

    private String clean(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        return trimmed.length() > MAX_NOTES ? trimmed.substring(0, MAX_NOTES) : trimmed;
    }
}
