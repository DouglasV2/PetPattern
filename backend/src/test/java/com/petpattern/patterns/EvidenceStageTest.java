package com.petpattern.patterns;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The four communication stages (spec Part 8) are deterministic and conservative.
 * These are product states, NOT medical confidence. Thresholds are PROVISIONAL
 * (need veterinary/statistical review) and are documented on {@link EvidenceStage}.
 */
class EvidenceStageTest {

    // --- Recurrence-only patterns (symptom observations, no exposure to compare) ---

    @Test
    void aSinglePeriodSymptomObservationIsStageOne() {
        assertThat(EvidenceStage.forRecurrence(1)).isEqualTo(EvidenceStage.STAGE_1_DATED);
    }

    @Test
    void twoSeparatePeriodsAreStageTwoNeverHigherWithoutComparison() {
        // A symptom seen in separate periods is "repeated" — but with no exposure to
        // compare against, it can never climb to an association stage.
        assertThat(EvidenceStage.forRecurrence(2)).isEqualTo(EvidenceStage.STAGE_2_REPEATED);
        assertThat(EvidenceStage.forRecurrence(9)).isEqualTo(EvidenceStage.STAGE_2_REPEATED);
    }

    // --- Food-exposure patterns (have a comparison denominator) ---

    @Test
    void twoFollowedExposuresWithComparisonAreStageThree() {
        // followed >= 2 and not outnumbered by counter-evidence -> possible association.
        assertThat(EvidenceStage.forFoodExposure(2, 1, 3)).isEqualTo(EvidenceStage.STAGE_3_POSSIBLE_ASSOCIATION);
    }

    @Test
    void threeFollowedExposuresOutweighingCounterEvidenceAreStageFour() {
        assertThat(EvidenceStage.forFoodExposure(3, 1, 4)).isEqualTo(EvidenceStage.STAGE_4_WORTH_VET);
    }

    @Test
    void counterEvidenceThatOutnumbersTheFollowedExposuresHoldsItAtStageTwo() {
        // Seen more than once, but more often the food was NOT followed by the symptom.
        assertThat(EvidenceStage.forFoodExposure(2, 5, 7)).isEqualTo(EvidenceStage.STAGE_2_REPEATED);
    }

    @Test
    void stagesExposeAStableNumberForOrdering() {
        assertThat(EvidenceStage.STAGE_1_DATED.number()).isEqualTo(1);
        assertThat(EvidenceStage.STAGE_4_WORTH_VET.number()).isEqualTo(4);
    }
}
