package com.petpattern.patterns;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * A possible pattern the deterministic engine surfaced this run.
 *
 * <p>The user-facing explanation is organised into four honest parts (spec Part 10):
 * <ol>
 *   <li>what was observed — {@code title} + {@code summary};</li>
 *   <li>what supports this — {@code evidence};</li>
 *   <li>what limits this — {@code limits} (counter-evidence, missing data);</li>
 *   <li>what this does not mean — {@code doesNotMean}.</li>
 * </ol>
 * {@code stage} is the {@link EvidenceStage} this run's evidence justifies (null
 * for recurrence-only symptom patterns, which the memory layer finishes from the
 * observation's separate-period count).
 */
public record PatternCandidate(
        String id,
        UUID petId,
        PatternType type,
        PatternConfidence confidence,
        String title,
        String summary,
        List<String> evidence,
        Instant detectedAt,
        UUID relatedFoodLogId,
        List<UUID> relatedCheckInIds,
        Severity severity,
        String urgentNote,
        EvidenceStage stage,
        List<String> limits,
        List<String> doesNotMean
) {
    /**
     * Backward-compatible constructor preserving the original 10-argument signature.
     * Every pre-existing call site (the dog, cat and generic-observation analyzers)
     * builds a non-urgent, {@link Severity#WATCH} candidate exactly as before, with
     * no evidence-stage or counter-evidence content (the memory layer derives its
     * stage from the observation).
     */
    public PatternCandidate(String id,
                            UUID petId,
                            PatternType type,
                            PatternConfidence confidence,
                            String title,
                            String summary,
                            List<String> evidence,
                            Instant detectedAt,
                            UUID relatedFoodLogId,
                            List<UUID> relatedCheckInIds) {
        this(id, petId, type, confidence, title, summary, evidence, detectedAt,
                relatedFoodLogId, relatedCheckInIds, Severity.WATCH, null,
                null, List.of(), List.of());
    }

    /**
     * Backward-compatible constructor for the urgent tier (adds severity + urgent
     * note) without the evidence-stage/counter-evidence fields.
     */
    public PatternCandidate(String id,
                            UUID petId,
                            PatternType type,
                            PatternConfidence confidence,
                            String title,
                            String summary,
                            List<String> evidence,
                            Instant detectedAt,
                            UUID relatedFoodLogId,
                            List<UUID> relatedCheckInIds,
                            Severity severity,
                            String urgentNote) {
        this(id, petId, type, confidence, title, summary, evidence, detectedAt,
                relatedFoodLogId, relatedCheckInIds, severity, urgentNote,
                null, List.of(), List.of());
    }
}
