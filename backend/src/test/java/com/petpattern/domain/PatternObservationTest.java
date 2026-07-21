package com.petpattern.domain;

import com.petpattern.patterns.PatternType;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The distinction at the heart of Part 9: {@code detectionCount} counts the
 * calendar days the deterministic engine re-surfaced the SAME evidence (it is
 * internal, used for persistence/sort). {@code episodeCount} counts genuinely
 * SEPARATE periods — the pattern went quiet and later came back. Only the latter
 * may drive any "seen before / repeated" language.
 */
class PatternObservationTest {

    private static final LocalDate DAY0 = LocalDate.of(2026, 3, 1);

    private PatternObservation newObservation() {
        return new PatternObservation(null, "pet:ITCHING_ABOVE_BASELINE", PatternType.ITCHING_ABOVE_BASELINE, DAY0);
    }

    @Test
    void aFreshObservationIsASingleEpisodeSeenOnce() {
        PatternObservation obs = newObservation();
        assertThat(obs.getDetectionCount()).isEqualTo(1);
        assertThat(obs.getEpisodeCount()).isEqualTo(1);
    }

    @Test
    void resurfacingOnConsecutiveDaysBumpsDetectionCountButNotEpisodeCount() {
        PatternObservation obs = newObservation();
        obs.recordDetection(DAY0.plusDays(1), "LOW", "t", "s");
        obs.recordDetection(DAY0.plusDays(2), "LOW", "t", "s");
        obs.recordDetection(DAY0.plusDays(3), "LOW", "t", "s");

        assertThat(obs.getDetectionCount()).isEqualTo(4);
        // Same continuous stretch — NOT three separate recurrences.
        assertThat(obs.getEpisodeCount()).isEqualTo(1);
    }

    @Test
    void resurfacingTheSameDayChangesNeitherCount() {
        PatternObservation obs = newObservation();
        obs.recordDetection(DAY0, "LOW", "t", "s");
        assertThat(obs.getDetectionCount()).isEqualTo(1);
        assertThat(obs.getEpisodeCount()).isEqualTo(1);
    }

    @Test
    void aGapWithinTheThresholdIsStillTheSameEpisode() {
        PatternObservation obs = newObservation();
        obs.recordDetection(DAY0.plusDays(PatternObservation.EPISODE_GAP_DAYS - 1), "LOW", "t", "s");
        assertThat(obs.getEpisodeCount()).isEqualTo(1);
    }

    @Test
    void reappearingAfterTheGapThresholdCountsAsASeparateEpisode() {
        PatternObservation obs = newObservation();
        // Detected, went quiet for two weeks, then came back — a genuinely separate period.
        obs.recordDetection(DAY0.plusDays(PatternObservation.EPISODE_GAP_DAYS), "LOW", "t", "s");
        assertThat(obs.getEpisodeCount()).isEqualTo(2);

        // A third separate period after another long quiet stretch.
        obs.recordDetection(DAY0.plusDays(PatternObservation.EPISODE_GAP_DAYS * 2L), "LOW", "t", "s");
        assertThat(obs.getEpisodeCount()).isEqualTo(3);
    }
}
