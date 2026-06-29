package com.petpattern.api;

import com.petpattern.api.dto.InsightResponse;
import com.petpattern.pattern.InsightService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/pets/{petId}/insights")
public class InsightController {

    private final InsightService insightService;

    public InsightController(InsightService insightService) {
        this.insightService = insightService;
    }

    @GetMapping
    public List<InsightResponse> insights(@PathVariable UUID petId) {
        return insightService.generateInsights(petId);
    }
}
