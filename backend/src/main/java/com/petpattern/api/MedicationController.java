package com.petpattern.api;

import com.petpattern.api.dto.CreateMedicationRequest;
import com.petpattern.api.dto.MedicationResponse;
import com.petpattern.auth.PetAccess;
import com.petpattern.domain.Medication;
import com.petpattern.domain.Pet;
import com.petpattern.repository.MedicationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/pets/{petId}/medications")
public class MedicationController {

    private static final int MAX_NAME = 160;
    private static final int MAX_NOTES = 500;

    private final PetAccess petAccess;
    private final MedicationRepository medicationRepository;

    public MedicationController(PetAccess petAccess, MedicationRepository medicationRepository) {
        this.petAccess = petAccess;
        this.medicationRepository = medicationRepository;
    }

    @GetMapping
    public List<MedicationResponse> list(@PathVariable UUID petId) {
        Pet pet = petAccess.requireOwnedPet(petId);
        return medicationRepository.findByPetOrderByStartDateDesc(pet).stream()
                .map(MedicationResponse::from)
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MedicationResponse create(@PathVariable UUID petId, @RequestBody CreateMedicationRequest request) {
        Pet pet = petAccess.requireOwnedPet(petId);

        String name = clean(request.name(), MAX_NAME);
        if (name == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A medication name is required");
        }
        LocalDate start = request.startDate() != null ? request.startDate() : LocalDate.now();
        LocalDate end = request.endDate();
        if (end != null && end.isBefore(start)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The end date can't be before the start date");
        }

        Medication medication = new Medication();
        medication.setPet(pet);
        medication.setName(name);
        medication.setStartDate(start);
        medication.setEndDate(end);
        medication.setNotes(clean(request.notes(), MAX_NOTES));
        return MedicationResponse.from(medicationRepository.save(medication));
    }

    @PostMapping("/{medicationId}/stop")
    public MedicationResponse stop(@PathVariable UUID petId, @PathVariable UUID medicationId) {
        Medication medication = findMedication(petId, medicationId);
        if (medication.getEndDate() == null) {
            medication.setEndDate(LocalDate.now());
        }
        return MedicationResponse.from(medicationRepository.save(medication));
    }

    @DeleteMapping("/{medicationId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID petId, @PathVariable UUID medicationId) {
        medicationRepository.delete(findMedication(petId, medicationId));
    }

    private Medication findMedication(UUID petId, UUID medicationId) {
        Pet pet = petAccess.requireOwnedPet(petId);
        return medicationRepository.findByIdAndPet(medicationId, pet)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Medication not found"));
    }

    private String clean(String value, int max) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        return trimmed.length() > max ? trimmed.substring(0, max) : trimmed;
    }
}
