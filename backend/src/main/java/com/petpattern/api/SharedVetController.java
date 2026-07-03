package com.petpattern.api;

import com.petpattern.api.dto.VetSummaryDto;
import com.petpattern.domain.Pet;
import com.petpattern.vet.VetShareService;
import com.petpattern.vet.VetSummaryService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

/**
 * Public, read-only vet summary reached via a share link. NO authentication —
 * that's the point — but access requires a valid (unguessable, unexpired) token,
 * it's rate-limited, and it returns nothing but the vet summary.
 */
@RestController
@RequestMapping("/api/shared/vet-summary")
public class SharedVetController {

    private final VetShareService vetShareService;
    private final VetSummaryService vetSummaryService;

    public SharedVetController(VetShareService vetShareService, VetSummaryService vetSummaryService) {
        this.vetShareService = vetShareService;
        this.vetSummaryService = vetSummaryService;
    }

    /**
     * The token is read from a header, NOT the path, so it never lands in access
     * logs / referrers (it's a long-lived bearer capability).
     */
    @GetMapping
    public VetSummaryDto shared(@RequestHeader(value = "X-Share-Token", required = false) String token) {
        Pet pet = vetShareService.resolve(token)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "This link is no longer active"));
        return vetSummaryService.build(pet.getId(), null);
    }
}
