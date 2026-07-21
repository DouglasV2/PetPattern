package com.petpattern.domain;

import com.petpattern.patterns.PatternType;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The distinction at the heart of Part 9: {@code detectionCount} counts the
 * calendar days the deterministic engine re-surfaced the SAME evidence (it is
 * internal, used for persistence/sort). {@code episodeCount} counts genuinely
 * SEPARATE periods — and it is measured against the DATA (the evidencing
 * check-in dates), never against how often the app is opened.
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
        // Continuous data: each detection's evidence sits next to the last observed day.
        obs.recordDetection(DAY0.plusDays(1), DAY0.plusDays(1), DAY0.plusDays(1), "LOW", "t", "s");
        obs.recordDetection(DAY0.plusDays(2), DAY0.plusDays(2), DAY0.plusDays(2), "LOW", "t", "s");
        obs.recordDetection(DAY0.plusDays(3), DAY0.plusDays(3), DAY0.plusDays(3), "LOW", "t", "s");

        assertThat(obs.getDetectionCount()).isEqualTo(4);
        // Same continuous stretch — NOT three separate recurrences.
        assertThat(obs.getEpisodeCount()).isEqualTo(1);
    }

    @Test
    void aLongCalendarGapWithContinuousDataStaysOneEpisode() {
        // The bug this pins: opening the patterns view rarely must NOT invent
        // recurrences when the pattern was continuously present in the data.
        PatternObservation obs = newObservation();
        LocalDate later = DAY0.plusDays(40);
        // Detected 40 calendar days later, but the DATA is continuous (evidence runs
        // right up to just after the first observation).
        obs.recordDetection(later, DAY0.plusDays(1), later, "LOW", "t", "s");

        assertThat(obs.getEpisodeCount()).isEqualTo(1);
    }

    @Test
    void resurfacingTheSameDayChangesNeitherCount() {
        PatternObservation obs = newObservation();
        obs.recordDetection(DAY0, DAY0, DAY0, "LOW", "t", "s");
        assertThat(obs.getDetectionCount()).isEqualTo(1);
        assertThat(obs.getEpisodeCount()).isEqualTo(1);
    }

    @Test
    void aDataGapWithinTheThresholdIsStillTheSameEpisode() {
        PatternObservation obs = newObservation();
        LocalDate within = DAY0.plusDays(PatternObservation.EPISODE_GAP_DAYS - 1);
        obs.recordDetection(within, within, within, "LOW", "t", "s");
        assertThat(obs.getEpisodeCount()).isEqualTo(1);
    }

    @Test
    void reappearingAfterADataGapCountsAsASeparateEpisode() {
        PatternObservation obs = newObservation();
        // The pattern went quiet in the DATA: the earliest new evidence is a real gap.
        LocalDate firstReturn = DAY0.plusDays(PatternObservation.EPISODE_GAP_DAYS);
        obs.recordDetection(firstReturn, firstReturn, firstReturn, "LOW", "t", "s");
        assertThat(obs.getEpisodeCount()).isEqualTo(2);

        LocalDate secondReturn = firstReturn.plusDays(PatternObservation.EPISODE_GAP_DAYS);
        obs.recordDetection(secondReturn, secondReturn, secondReturn, "LOW", "t", "s");
        assertThat(obs.getEpisodeCount()).isEqualTo(3);
    }

    @Test
    void detectionWithoutEvidenceDatesNeverInventsAnEpisode() {
        PatternObservation obs = newObservation();
        // A candidate with no related check-ins (null evidence dates) must not bump.
        obs.recordDetection(DAY0.plusDays(40), null, null, "LOW", "t", "s");
        assertThat(obs.getEpisodeCount()).isEqualTo(1);
    }
}
