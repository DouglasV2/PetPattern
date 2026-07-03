package com.petpattern.ai;

import com.petpattern.domain.StoolState;
import com.petpattern.i18n.Copy;
import com.petpattern.repository.AiParseAttemptRepository;
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

    public AiExtractionService(AiProvider provider, AiParseAttemptRepository attemptRepository) {
        this.provider = provider;
        this.attemptRepository = attemptRepository;
    }

    public DailyNoteExtractionResult parseDailyNote(UUID petId, String note) {
        DailyNoteExtractionResult result;
        try {
            result = provider.extract(note);
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
                false, null, null, "LOW", warnings);
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
                result.possibleFoodTrigger(),
                result.confidence(),
                warnings
        );
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
