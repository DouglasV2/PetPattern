package com.petpattern.api;

import com.petpattern.api.dto.InsightResponse;
import com.petpattern.auth.PetAccess;
import com.petpattern.pattern.InsightService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/pets/{petId}/insights")
public class InsightController {

    private final InsightService insightService;
    private final PetAccess petAccess;

    public InsightController(InsightService insightService, PetAccess petAccess) {
        this.insightService = insightService;
        this.petAccess = petAccess;
    }

    @GetMapping
    public List<InsightResponse> insights(@PathVariable UUID petId) {
        petAccess.requireOwnedPet(petId);
        return insightService.generateInsights(petId);
    }
}
