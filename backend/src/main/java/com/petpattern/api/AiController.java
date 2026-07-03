package com.petpattern.api;

import com.petpattern.ai.AiExtractionService;
import com.petpattern.ai.DailyNoteExtractionResult;
import com.petpattern.api.dto.ParseDailyNoteRequest;
import com.petpattern.auth.PetAccess;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * AI is a low-friction input helper here, not a chatbot and not a diagnosis
 * engine. This endpoint only suggests structured fields; the frontend always
 * shows a confirmation step before anything is saved.
 */
@RestController
@RequestMapping("/api/ai")
public class AiController {

    private final AiExtractionService aiExtractionService;
    private final PetAccess petAccess;

    public AiController(AiExtractionService aiExtractionService, PetAccess petAccess) {
        this.aiExtractionService = aiExtractionService;
        this.petAccess = petAccess;
    }

    @PostMapping("/parse-daily-note")
    public DailyNoteExtractionResult parseDailyNote(@Valid @RequestBody ParseDailyNoteRequest request) {
        // Require an authenticated owner; if a pet is named, require it be theirs.
        if (request.petId() != null) {
            petAccess.requireOwnedPet(request.petId());
        } else {
            petAccess.currentOwner();
        }
        return aiExtractionService.parseDailyNote(request.petId(), request.note());
    }
}
