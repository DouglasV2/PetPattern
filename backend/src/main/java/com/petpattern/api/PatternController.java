package com.petpattern.api;

import com.petpattern.analytics.AnalyticsService;
import com.petpattern.api.dto.PatternResponse;
import com.petpattern.api.dto.PatternStatusRequest;
import com.petpattern.api.dto.PatternTimelineDto;
import com.petpattern.auth.PetAccess;
import com.petpattern.domain.AnalyticsEventType;
import com.petpattern.patterns.PatternMemoryService;
import com.petpattern.patterns.PatternTimelineService;
import com.petpattern.patterns.PatternType;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

@RestController
@RequestMapping("/api/pets/{petId}/patterns")
public class PatternController {

    private final PatternMemoryService patternMemoryService;
    private final PatternTimelineService timelineService;
    private final PetAccess petAccess;
    private final AnalyticsService analytics;

    public PatternController(PatternMemoryService patternMemoryService,
                            PatternTimelineService timelineService,
                            PetAccess petAccess,
                            AnalyticsService analytics) {
        this.patternMemoryService = patternMemoryService;
        this.timelineService = timelineService;
        this.petAccess = petAccess;
        this.analytics = analytics;
    }

    @GetMapping
    public List<PatternResponse> patterns(@PathVariable UUID petId) {
        petAccess.requireOwnedPet(petId);
        // NOTE: this list endpoint is fetched automatically by the app on every pet load / refresh
        // (loadPetData), so recording PATTERN_VIEWED here would inflate it on background loads. The
        // "viewed a pattern" signal is recorded only on an EXPLICIT open — see the timeline
        // endpoints below, which fire only when the owner opens a specific pattern.
        return patternMemoryService.listPatterns(petId);
    }

    /**
     * Owner's standing decision about a possible pattern (acknowledged, resolved,
     * not relevant, told the vet). The deterministic engine keeps detecting, but
     * this judgement sticks across detections.
     */
    @PostMapping("/{patternKey}/status")
    public PatternResponse setStatus(@PathVariable UUID petId,
                                     @PathVariable String patternKey,
                                     @Valid @RequestBody PatternStatusRequest request) {
        petAccess.requireOwnedPet(petId);
        return patternMemoryService.setStatus(petId, patternKey, request.status());
    }

    /**
     * "What changed before this?" timeline for one possible pattern, requested
     * by its stable id from the pattern list.
     */
    @GetMapping("/{patternId}/timeline")
    public PatternTimelineDto timeline(@PathVariable UUID petId, @PathVariable String patternId) {
        petAccess.requireOwnedPet(petId);
        // An explicit "open this pattern" action — the real PATTERN_VIEWED signal (never fired by
        // the automatic list fetch above).
        analytics.recordCurrent(AnalyticsEventType.PATTERN_VIEWED);
        return timelineService.timelineForPatternId(petId, patternId);
    }

    /**
     * Fallback timeline lookup by pattern type, for clients that prefer a query
     * parameter over round-tripping the stable id.
     */
    @GetMapping("/timeline")
    public PatternTimelineDto timelineByType(@PathVariable UUID petId, @RequestParam("type") String type) {
        petAccess.requireOwnedPet(petId);
        // Same explicit-open signal as the by-id timeline above.
        analytics.recordCurrent(AnalyticsEventType.PATTERN_VIEWED);
        PatternType patternType;
        try {
            patternType = PatternType.valueOf(type.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown pattern type: " + type);
        }
        return timelineService.timelineForType(petId, patternType);
    }
}
