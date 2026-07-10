package com.petpattern.ai;

import com.petpattern.domain.Pet;
import com.petpattern.domain.Species;
import com.petpattern.domain.StoolState;
import com.petpattern.i18n.Copy;
import com.petpattern.repository.AiParseAttemptRepository;
import com.petpattern.repository.PetRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Orchestrates note extraction: runs the configured {@link AiProvider}, keeps
 * the request alive even if the provider fails, attaches honest warnings, and
 * records a best-effort audit row.
 *
 * <p>Hard rules: AI output is never saved automatically, and an AI failure must
 * never crash the app. The worst case is an empty suggestion the owner fills in
 * by hand.
 */
@Service
public class AiExtractionService {

    private static final Logger log = LoggerFactory.getLogger(AiExtractionService.class);
    private static final int MAX_NOTE_LENGTH = 2000;

    private final AiProvider provider;
    private final AiParseAttemptRepository attemptRepository;
    private final PetRepository petRepository;

    public AiExtractionService(AiProvider provider,
                               AiParseAttemptRepository attemptRepository,
                               PetRepository petRepository) {
        this.provider = provider;
        this.attemptRepository = attemptRepository;
        this.petRepository = petRepository;
    }

    public DailyNoteExtractionResult parseDailyNote(UUID petId, String note) {
        // The provider is species-aware: dogs/cats map to explicit fields, starter
        // species to generic signals. A missing pet just extracts generically.
        Species species = resolveSpecies(petId);
        DailyNoteExtractionResult result;
        try {
            result = provider.extract(note, species);
        } catch (RuntimeException ex) {
            log.warn("AI provider '{}' failed to extract a note; returning a safe empty suggestion.",
                    provider.name(), ex);
            result = safeFallback();
        }

        result = withProviderContext(result);
        recordAttempt(petId, note, result);
        return result;
    }

    /**
     * Empty, low-confidence suggestion used when the provider throws. The owner
     * simply fills the fields in by hand — nothing breaks.
     */
    private DailyNoteExtractionResult safeFallback() {
        List<String> warnings = new ArrayList<>();
        warnings.add(Copy.t("Suggestions are temporarily unavailable. Please fill in the fields yourself."));
        return new DailyNoteExtractionResult(
                null, StoolState.UNKNOWN, null, null, null,
                false, null, null, null, null, null, null, null, "LOW", warnings,
                List.of(), null);
    }

    /** A quiet reminder that these are just guesses read from the note. */
    private DailyNoteExtractionResult withProviderContext(DailyNoteExtractionResult result) {
        if (provider.configured()) {
            return result;
        }
        List<String> warnings = new ArrayList<>(result.warnings() == null ? List.of() : result.warnings());
        warnings.add(Copy.t("These are quick guesses from your note — review before saving."));
        return new DailyNoteExtractionResult(
                result.itchingScore(),
                result.stoolState(),
                result.appetiteLevel(),
                result.waterLevel(),
                result.energyLevel(),
                result.vomiting(),
                result.earRedness(),
                result.litterBoxUse(),
                result.urinationChange(),
                result.straining(),
                result.hidingBehavior(),
                result.weightConcern(),
                result.possibleFoodTrigger(),
                result.confidence(),
                warnings,
                result.detectedSignals(),
                result.possibleEnvironmentTrigger()
        );
    }

    private Species resolveSpecies(UUID petId) {
        if (petId == null) {
            return null;
        }
        return petRepository.findById(petId).map(Pet::getSpecies).orElse(null);
    }

    private void recordAttempt(UUID petId, String note, DailyNoteExtractionResult result) {
        try {
            String trimmed = note == null ? null : note.substring(0, Math.min(note.length(), MAX_NOTE_LENGTH));
            attemptRepository.save(new AiParseAttempt(petId, trimmed, provider.name(), result.confidence()));
        } catch (RuntimeException ex) {
            // Audit is best-effort; never let it break the user's request.
            log.debug("Could not persist AI parse attempt", ex);
        }
    }
}
