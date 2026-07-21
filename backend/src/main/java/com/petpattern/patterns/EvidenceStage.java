package com.petpattern.patterns;

/**
 * The four evidence-communication stages (spec Part 8). These are PRODUCT
 * communication states, not medical or statistical confidence levels — they say
 * how much the recorded data supports talking about a possible association, and
 * never claim a cause.
 *
 * <p>Transitions are deterministic and deliberately conservative (they under-claim
 * rather than over-claim). All thresholds here are PROVISIONAL: they shape how the
 * product talks about evidence and have NOT been validated against veterinary or
 * statistical review. They must be revisited with real data before any stronger
 * claim is made.
 *
 * <ul>
 *   <li><b>Stage 1 — dated observation.</b> A single dated sequence. Shown as a
 *       fact on the timeline; never described as repeated or as an association.</li>
 *   <li><b>Stage 2 — repeated observation.</b> A similar sequence appeared in more
 *       than one independent period. Repetition is stated as a fact; it still does
 *       not establish a connection.</li>
 *   <li><b>Stage 3 — possible association worth tracking.</b> Only reachable when
 *       there is a comparison denominator (exposures that were and were not
 *       followed by the outcome): the followed periods must not be outnumbered by
 *       the counter-evidence. No probability or diagnosis is implied.</li>
 *   <li><b>Stage 4 — worth discussing with a vet.</b> Several independent followed
 *       periods clearly outweighing the counter-evidence. Still not a claim of
 *       clinical significance or causality.</li>
 * </ul>
 */
public enum EvidenceStage {
    STAGE_1_DATED(1),
    STAGE_2_REPEATED(2),
    STAGE_3_POSSIBLE_ASSOCIATION(3),
    STAGE_4_WORTH_VET(4);

    private final int number;

    EvidenceStage(int number) {
        this.number = number;
    }

    /** Stable 1..4 ordinal for ordering and display; not a score. */
    public int number() {
        return number;
    }

    /**
     * Stage for a recurrence-only pattern (a symptom observation with no exposure
     * to compare against). Such a pattern can never climb past "repeated": with no
     * comparison denominator there is nothing to call a possible association.
     *
     * @param episodeCount genuinely separate periods (see PatternObservation)
     */
    public static EvidenceStage forRecurrence(int episodeCount) {
        return episodeCount >= 2 ? STAGE_2_REPEATED : STAGE_1_DATED;
    }

    /**
     * Stage for a food-exposure pattern, which has a comparison denominator.
     *
     * @param followed    independent exposures that WERE followed by the outcome
     * @param notFollowed assessed exposures that were NOT followed by the outcome
     * @param assessed    total exposures we could evaluate (followed + notFollowed)
     */
    public static EvidenceStage forFoodExposure(int followed, int notFollowed, int assessed) {
        if (followed < 2) {
            return forRecurrence(followed);
        }
        // Counter-evidence outweighs the followed periods: repeated, but not an
        // association we should promote (spec Part 11 — contradiction weakens).
        if (notFollowed > followed) {
            return STAGE_2_REPEATED;
        }
        if (followed >= 3 && followed > notFollowed && assessed >= 3) {
            return STAGE_4_WORTH_VET;
        }
        return STAGE_3_POSSIBLE_ASSOCIATION;
    }
}
