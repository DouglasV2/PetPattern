package com.petpattern.api;

import com.petpattern.api.dto.VetSummaryDto;
import com.petpattern.auth.PetAccess;
import com.petpattern.vet.VetSummaryService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/pets/{petId}/vet-summary")
public class VetSummaryController {

    private final VetSummaryService vetSummaryService;
    private final PetAccess petAccess;

    public VetSummaryController(VetSummaryService vetSummaryService, PetAccess petAccess) {
        this.vetSummaryService = vetSummaryService;
        this.petAccess = petAccess;
    }

    @GetMapping
    public VetSummaryDto vetSummary(@PathVariable UUID petId,
                                    @RequestParam(value = "days", required = false) Integer days) {
        petAccess.requireOwnedPet(petId);
        return vetSummaryService.build(petId, days);
    }
}
