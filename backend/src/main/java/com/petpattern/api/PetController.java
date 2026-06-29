package com.petpattern.api;

import com.petpattern.api.dto.PetCreateRequest;
import com.petpattern.api.dto.PetResponse;
import com.petpattern.domain.Pet;
import com.petpattern.domain.Sex;
import com.petpattern.repository.PetRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/pets")
public class PetController {

    private final PetRepository petRepository;

    public PetController(PetRepository petRepository) {
        this.petRepository = petRepository;
    }

    @GetMapping
    public List<PetResponse> listPets() {
        return petRepository.findAll().stream().map(PetResponse::from).toList();
    }

    @GetMapping("/{petId}")
    public PetResponse getPet(@PathVariable UUID petId) {
        return PetResponse.from(findPet(petId));
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
