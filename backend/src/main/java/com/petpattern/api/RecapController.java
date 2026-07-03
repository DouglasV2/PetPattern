package com.petpattern.api;

import com.petpattern.api.dto.RecapResponse;
import com.petpattern.auth.PetAccess;
import com.petpattern.domain.Pet;
import com.petpattern.recap.RecapService;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/pets/{petId}/recap")
public class RecapController {

    private final PetAccess petAccess;
    private final RecapService recapService;

    public RecapController(PetAccess petAccess, RecapService recapService) {
        this.petAccess = petAccess;
        this.recapService = recapService;
    }

    @GetMapping
    public RecapResponse recap(@PathVariable UUID petId,
                               @RequestParam(value = "days", required = false, defaultValue = "30") int days) {
        Pet pet = petAccess.requireOwnedPet(petId);
        return recapService.recap(pet, days);
    }
}
