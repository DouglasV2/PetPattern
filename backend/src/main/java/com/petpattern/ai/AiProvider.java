package com.petpattern.ai;

import com.petpattern.domain.Species;

/**
 * Abstraction over whatever turns a messy owner note into structured field
 * suggestions. Today the only implementation is a deterministic local reader
 * ({@link MockAiProvider}); a real LLM-backed provider can be added later
 * without touching the controller or the confirm-before-save flow.
 *
 * <p>AI is positioned as a low-friction input helper, never as the product. The
 * deterministic pattern engine remains the source of truth.
 */
public interface AiProvider {

    /** Short identifier for auditing (e.g. "mock-keyword"). */
    String name();

    /** Whether a real, configured AI backend is in use. False for the local fallback. */
    boolean configured();

    /**
     * Extract suggested fields from a free-text note for the given species. Dogs and
     * cats map to explicit fields; starter species use the generic detectedSignals.
     * A null species means "unspecified" (treat generically). Must never throw on
     * bad input.
     */
    DailyNoteExtractionResult extract(String note, Species species);

    /** Species-blind convenience for callers/tests without a pet context. */
    default DailyNoteExtractionResult extract(String note) {
        return extract(note, null);
    }
}
