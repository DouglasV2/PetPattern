package com.petpattern.api;

import com.petpattern.api.dto.PatternResponse;
import com.petpattern.patterns.PatternEngine;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/pets/{petId}/patterns")
public class PatternController {

    private final PatternEngine patternEngine;

    public PatternController(PatternEngine patternEngine) {
        this.patternEngine = patternEngine;
    }

    @GetMapping
    public List<PatternResponse> patterns(@PathVariable UUID petId) {
        return patternEngine.analyze(petId).stream()
                .map(PatternResponse::from)
                .toList();
    }
}
