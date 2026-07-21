package com.petpattern.api.dto;

import com.petpattern.domain.PatternObservation;
import com.petpattern.patterns.PatternCandidate;
import com.petpattern.patterns.PatternConfidence;
import com.petpattern.patterns.PatternType;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Part 9 / Part 32: the API's "seen before" signal must reflect genuinely
 * separate periods ({@code episodeCount}), never the engine-run-day
 * {@code detectionCount}. The same evidence resurfacing day after day must NOT
 * read as recurrence.
 */
class PatternResponseSeenBeforeTest {

    private static final LocalDate DAY0 = LocalDate.of(2026, 3, 1);

    private PatternCandidate candidate(UUID petId) {
        return new PatternCandidate(
                petId + ":ITCHING_ABOVE_BASELINE", petId, PatternType.ITCHING_ABOVE_BASELINE,
                PatternConfidence.LOW, "Scratching is higher than usual", "summary",
                List.of("a"), Instant.now(), null, List.of());
    }

    @Test
    void manyDetectionDaysInOneStretchAreNotSeenBefore() {
        UUID petId = UUID.randomUUID();
        PatternObservation obs = new PatternObservation(null, petId + ":ITCHING_ABOVE_BASELINE",
                PatternType.ITCHING_ABOVE_BASELINE, DAY0);
        for (int i = 1; i <= 6; i++) {
            // Continuous data (evidence advances day by day) — one stretch.
            obs.recordDetection(DAY0.plusDays(i), DAY0.plusDays(i), DAY0.plusDays(i), "LOW", "t", "s");
        }

        PatternResponse response = PatternResponse.from(candidate(petId), obs);

        assertThat(obs.getDetectionCount()).isEqualTo(7); // internal, high
        assertThat(response.episodeCount()).isEqualTo(1);
        assertThat(response.seenBefore()).isFalse();
    }

    @Test
    void twoSeparatePeriodsReadAsSeenBefore() {
        UUID petId = UUID.randomUUID();
        PatternObservation obs = new PatternObservation(null, petId + ":ITCHING_ABOVE_BASELINE",
                PatternType.ITCHING_ABOVE_BASELINE, DAY0);
        LocalDate gap = DAY0.plusDays(PatternObservation.EPISODE_GAP_DAYS);
        obs.recordDetection(gap, gap, gap, "LOW", "t", "s");

        PatternResponse response = PatternResponse.from(candidate(petId), obs);

        assertThat(response.episodeCount()).isEqualTo(2);
        assertThat(response.seenBefore()).isTrue();
    }

    @Test
    void aBrandNewCandidateWithNoRememberedObservationIsNeverSeenBefore() {
        UUID petId = UUID.randomUUID();
        PatternResponse response = PatternResponse.from(candidate(petId), null);
        assertThat(response.episodeCount()).isEqualTo(1);
        assertThat(response.seenBefore()).isFalse();
    }

    @Test
    void stageForARecurrenceOnlyPatternReflectsSeparatePeriods() {
        UUID petId = UUID.randomUUID();
        // A symptom pattern with no exposure to compare against: one period -> Stage 1.
        PatternObservation single = new PatternObservation(null, petId + ":ITCHING_ABOVE_BASELINE",
                PatternType.ITCHING_ABOVE_BASELINE, DAY0);
        assertThat(PatternResponse.from(candidate(petId), single).stage()).isEqualTo("STAGE_1_DATED");

        // Seen in two separate periods -> Stage 2, but never an association stage.
        PatternObservation twoPeriods = new PatternObservation(null, petId + ":ITCHING_ABOVE_BASELINE",
                PatternType.ITCHING_ABOVE_BASELINE, DAY0);
        LocalDate gap = DAY0.plusDays(PatternObservation.EPISODE_GAP_DAYS);
        twoPeriods.recordDetection(gap, gap, gap, "LOW", "t", "s");
        assertThat(PatternResponse.from(candidate(petId), twoPeriods).stage()).isEqualTo("STAGE_2_REPEATED");
    }
}
