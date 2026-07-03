package com.petpattern.ai;

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

    /** Extract suggested fields from a free-text note. Must never throw on bad input. */
    DailyNoteExtractionResult extract(String note);
}
